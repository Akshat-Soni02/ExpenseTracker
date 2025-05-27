import { modifyWalletBalance } from "./walletService.js";
import { distributeAmount, findGroupById, settleAllGroups } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";
import settlement from "../models/settlement.js";
import ErrorHandler from "../middlewares/error.js";
import { withSession } from "../utils/transaction.js";
import { findUserById } from "./userService.js";
import { addPushJob } from "../queues/push/processor.js";
import logger from "../logger/index.js";


/**
 * the service first tries to modify wallet states, 
 * then it changes user's personal states with each
 * other (also if the settlement happened in a 
 * group then changes group's state as well)
 * 
 * if its not included in any group then it settles all
 * the groups
 * 
 * @param {{user_id: string, data: object}} param0 
 * @param {session} session
 * @returns newSettlement
 */
export const createSettleService = async ({user_id, data}, session) => {

  let {
    settlement_description,
    payer_wallet_id,
    payer_id,
    receiver_wallet_id,
    receiver_id,
    group_id,
    status,
    amount
  } = data;

  if (status === "sent") {
    payer_id = user_id;

    if (payer_wallet_id) {
      await modifyWalletBalance({id: payer_wallet_id, amount: -1*amount}, session);
    }

  } else if (status === "receiver") {
    receiver_id = user_id;

    if (receiver_wallet_id) {
      await modifyWalletBalance({id: receiver_wallet_id, amount}, session);
    }

  }

  await handleSettlementRelations({payer_id, receiver_id, amount, group_id}, session);

  if(!group_id) {
    await settleAllGroups(payer_id.toString(), receiver_id.toString(), session);
  }

  const {status: excludedStatus , ...rest} = data;

  rest.payer_id = payer_id;
  rest.receiver_id = receiver_id;

  /**
   * .session(session) doesn't work on create queries
   */
  const doc = await settlement.create([rest], {session});
  const newSettlement = doc[0];

  if(!newSettlement) throw new ErrorHandler(`db operation failed to create new settlement`);

  try {
    await sendNewSettlementPushNotification({settlement: newSettlement, active_user_id: user_id, isPayer: status === "sent", inGroup: group_id})
  } catch (error) {
    logger.warn(error);
  }

  logger.info(`settlement ${newSettlement._id} created by user ${user_id}`);
  return newSettlement;
}



/**
 * NOTE - Don't send anything other than description for now
 * @param {{settlement_id: string, data: object}} param0 
 * @returns updated settlement
 */
export const updateSettleService = async ({ settlement_id, data} ) => {
  if(data.amount || data.payer_id || data.receiver_id) throw new ErrorHandler(`Client requested more details updated then supported for settlement ${settlement_id}`);

  let existingSettle = await findSettlementById(settlement_id);
  if (!existingSettle) throw new ErrorHandler(`Settlement not found: ${settlement_id}`);

  const updatedSettle = await settlement.findByIdAndUpdate( settlement_id, data, { new: true, runValidators: true });

  if (!updatedSettle) throw new ErrorHandler(`Update operation failed for settlemenet ${settlement_id}`);

  logger.info(`settlement ${settlement_id} updated`);
  return updatedSettle;
}


/**
 * 
 * here we take the existing session and 
 * revert all the changes made by it
 * 
 * @param {string} settlement_id 
 * @param {session} session 
 * @returns nothing
 */
export const deleteSettleService = async (settlement_id, session) => {

  let curSettlement = await findSettlementById(settlement_id, session);

  if (!curSettlement) throw new ErrorHandler(`Settlement not found: ${settlement_id}`);

  await revertSettlementEffects(curSettlement, session);

  let query = withSession(settlement.findByIdAndDelete(settlement_id), session);
  const deletedSettlement = await query;

  if(!deletedSettlement) throw new ErrorHandler(`delete operation failed on settlement ${settlement_id}`);
  logger.info(`settlement ${settlement_id} deleted`);
}


/**
 * 
 * @param {string} settlement_id 
 * @returns settlement with names contained
 */
export const fetchSettlementDetails = async (settlement_id) => {
  const settleObj = await findSettlementById(settlement_id);
  
  if (!settleObj) {
      throw new ErrorHandler(`Settlement not found: ${settlement_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });
  }

  const curSettlement = settleObj.toObject();

  const payer = await findUserById(curSettlement.payer_id);
  if(!payer) throw new ErrorHandler(`Payer ${curSettlement.payer_id} not found for settlement ${settlement_id}`);

  const receiver = await findUserById(curSettlement.receiver_id);
  if(!receiver) throw new ErrorHandler(`Receiver ${curSettlement.receiver_id} not found for settlement ${settlement_id}`);

  return {...curSettlement, payer_name: payer.name, receiver_name: receiver.name};
}


/**
 * 
 * it updates group's state as well user's state according to settlement
 * 
 * @param {{payer_id: string, receiver_id: string, amount: number, group_id: string}} param0
 * @param {session} session
 */
export const handleSettlementRelations = async ({payer_id, receiver_id, amount, group_id}, session) => {

  if(!amount || !payer_id || !receiver_id) throw new ErrorHandler(`Invalid settlement details to update relations`);

  if (group_id){
    await distributeAmount({
      groupId: group_id,
      giverId: payer_id,
      borrowers: [{user_id: receiver_id, amount}],
    }, session);
  }

  await updateFriendlyExchangeStatesOnLending({
    lender_id: payer_id,
    borrowers: [{user_id: receiver_id, amount}],
  }, session);

}



/**
 * 
 * Reverts wallets data and then process
 * settlement creation function with 
 * upside down data
 * 
 * @param {object} curSettlement 
 * @param {session} session 
 */
export const revertSettlementEffects = async (curSettlement, session) => {
  try {

    if (curSettlement.payer_wallet_id) {
      await modifyWalletBalance({
        id: curSettlement.payer_wallet_id,
        amount: curSettlement.amount,
      }, session);
    }

    if (curSettlement.receiver_wallet_id) {
      await modifyWalletBalance({
        id: curSettlement.receiver_wallet_id,
        amount: -curSettlement.amount,
        zeroTrue: true
      }, session);
    }

    await handleSettlementRelations({
      payer_id: curSettlement.receiver_id,
      receiver_id: curSettlement.payer_id,
      amount: curSettlement.amount,
      group_id: curSettlement?.group_id,
    }, session);

  } catch (error) {
    throw error;
  }
};



/**
 * 
 * @param {string} settlement_id 
 * @param {session} session 
 * @returns settlement if found else nothing
 */
export const findSettlementById = async (settlement_id, session) => {

  let query = withSession( settlement.findById(settlement_id), session);
  const curSettlement = await query;

  if(!curSettlement) {
    logger.error(`Settlement not found: ${settlement_id}`);
    return;
  }

  return curSettlement;
}


/**
 * 
 * @param {{userId: string, group_id: string}} param0 
 * @returns array of settlement
 * @throws use in try catch only
 */
export const findUserSettlements = async ({userId, group_id}) => {
  let filter = {
    $or: [
      { "payer_id": userId },
      { "receiver_id": userId },
    ],
  };

  if (group_id) {
    filter.group_id = group_id;
  }

  const settlements = await settlement.find(filter).sort({
    created_at: -1,
  });

  return settlements;
}


/**
 * 
 * @param {string} group_id 
 * @returns array of settlements
 */
export const findGroupSettlements = async (group_id) => {
  const settlements = await settlement.find({group_id});
  return settlements;
}


/**
 * Gets user id and utilized the user's tokens to send notifications
 * @param {{user_id: string, notification_title: string, notification_body: string}} param0 
 * @returns nothing
 */
export const settlementPushNotificationService = async ({user_id, notification_title, notification_body}) => {

  const user = await findUserById(user_id);

  if (!user) {
      logger.warn(`User not found: ${user_id}`);
      throw new ErrorHandler(`User ${user_id} not found to send notification of settlement`);
  }

  const tokens = user.accessTokens || [];

  if(tokens.length === 0) return;

  for (const token of tokens) {
      try {
          await addPushJob({token, title: notification_title, body: notification_body});
      } catch (tokenErr) {
          logger.error(`Failed to ${notification_title} settlement push notification`);
      }
  }
}



/**
 * Sends push notification for showing a user created settlement
 * 
 * @param {{settlement: object, active_user_id: string, isPayer: boolean, inGroup: boolean}} param0
 * @returns nothing if success else throws error
 */
export const sendNewSettlementPushNotification = async({settlement, active_user_id, isPayer, inGroup}) => {
  try{
      const active_user = await findUserById(active_user_id);
      if(!active_user) {
          logger.warn(`user not found ${active_user_id}, terminating push notification for settlement creation`);
          return;
      }

      const title = "🤝🏻 Settled";

      if(inGroup) {
        const active_group = await findGroupById(settlement.group_id);
        if(!active_group) throw new ErrorHandler(`Group not found: ${settlement.group_id}`);

        let body = `Dues marked settled by ${active_user.name} in ${active_group.group_title}`
        let notificationReceiver = settlement.payer_id;

        if(isPayer) {
          body = `${active_user.name} has settled their dues in ${active_group.group_title}.`;
          notificationReceiver = settlement.receiver_id;
        }

        await settlementPushNotificationService({user_id: notificationReceiver, notification_title: title, notification_body: body});

      } else {
        let body = `All dues marked settled by ${active_user.name}`
        let notificationReceiver = settlement.payer_id;

        if(isPayer) {
          body = `${active_user.name} has settled all of their dues.`;
          notificationReceiver = settlement.receiver_id;
        }
        await settlementPushNotificationService({user_id: notificationReceiver, notification_title: title, notification_body: body});
      }
  }
  catch(err){
      throw err;
  }
}