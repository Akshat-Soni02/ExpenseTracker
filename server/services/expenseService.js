import expense from "../models/expense.js";
import { modifyWalletBalance, sufficientBalance } from "./walletService.js";
import { distributeAmount, findGroupById } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";
import ErrorHandler from "../middlewares/error.js";
import logger from "../logger/index.js";
import { withSession } from "../utils/transaction.js";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import { findUserById } from "./userService.js";
import { addPushJob } from "../queues/push/processor.js";
import { uploadMedia } from "./cloudinaryService.js";
import { v4 as uuidv4 } from 'uuid';
import user from "../models/user.js";
import { deleteMedia } from "./cloudinaryService.js";

/**
 * 
 * first uploads media if there is 
 * then changes respective datas
 * 
 * @param {{file: string, data: object}} param0 
 * @param {session} session 
 * @returns new expense
 */
export const createExpenseService = async ({file, data}, session) => {

  let media = await updateExpenseMedia(file);

  const { lenders, total_amount, wallet_id, group_id, borrowers } = data;

  await handleExpenseRelations({
    lender_id: lenders[0].user_id,
    total_amount,
    wallet_id,
    group_id,
    borrowers,
  }, session);

  const doc = await expense.create([{...data, media}], {session});
  const newExpense = doc[0];
  if (!newExpense) throw new ErrorHandler(`Create operation failed for expense`);

  try {
    await sendNewExpensePushNotification({expense: newExpense, active_user_id: data.creator.creator_id.toString()});
  } catch (error) {
    logger.warn(error);
  }

  logger.info(`Expense ${newExpense._id} created by ${data.creator.creator_id}`);
  return newExpense
}


/**
 * uploads media exclusively for expense
 * @param {FormData} file 
 * @returns media obj
 */
export const updateExpenseMedia = async (file) => {
  if(!file) return null;

  let media = null;
  const today = new Date().toISOString().split('T')[0];

  const mediaPath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const publicId = `expense/${uuidv4()}/${today}`;

  const result = await uploadMedia(mediaPath, "expenseMedia", publicId);

  media = {
    url: result.secure_url,
    public_id: result.public_id,
  };

  return media;
}

/**
 * remove expense's wallet
 * 
 * @param {string} expense_id 
 */
export const detachWallet = async (expense_id) => {
  const curExpense = await findExpenseById(expense_id);
  if(!curExpense) {
    throw new ErrorHandler(`Expense not found ${expense_id}, can't remove wallet`);
  }

  if(curExpense.wallet_id) {
    await modifyWalletBalance({ id: curExpense.wallet_id, amount: curExpense.total_amount, zeroTrue: true});
    curExpense.wallet_id = null;
  }

  await curExpense.save();
}


/**
 * 
 * 
 * @param {{expense_id: string, data: object}} param0 
 * @param {session} session 
 * @returns updated expense
 */
export const updateExpenseService = async ({expense_id, data}, session) => {

    const updatedDetails = data;

    let existingExpense = await findExpenseById(expense_id, session);

    if (!existingExpense) throw new ErrorHandler(`expense not found: ${expense_id}, cannot update expense`);

    /**
     * cases with wallet - 
     * c-1 earlier there was a wallet and now wallet is removed
     * c-2 earlier there was no wallet and now wallet is added
     * c-3 earlier there was a wallet and now wallet is updated
     * c-4 no wallet update (1. there is a wallet earlier, 2. there is no wallet earlier)
     */
    let newAmount = updatedDetails.total_amount !== undefined ? updatedDetails.total_amount : existingExpense.total_amount;

    /**
     * @todo c-1 is not implemented yet
     * 
     * considering we only get wallet_id in 
     * updated details when its altered from earlier 
     * state (c-2, c-3) res
     */

    /**
     * this handles c-2 and c-3
     */
    if(updatedDetails.wallet_id !== undefined) {

      if(!sufficientBalance({id: updatedDetails.wallet_id, amount: newAmount})) {
        throw new ErrorHandler(`Insuffecient wallet balance`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});
      }

      /**
       * since the revert effect doesn't take 
       * care of new wallet balance updates we need to
       * perform here
       */
      await modifyWalletBalance({id: updatedDetails.wallet_id, amount: -1*newAmount}, session);

      /**
       * this handles c-4 (there is a wallet earlier)
       * (here another case c-1 could be possible in which case we need to
       * redeposit money in wallet but @todo need to update this function later 
       * according to frontend response)
       */
    } else if(existingExpense.wallet_id) {

      if(!sufficientBalance({id: updatedDetails.wallet_id, amount: newAmount - existingExpense.total_amount})) {
        throw new ErrorHandler(`Insuffecient wallet balance`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});
      }

      /**
       * we are putting difference in the wallet,
       * the revert effect will take out the earlier amount and hence 
       * things will balance out
       */

      await modifyWalletBalance({id: existingExpense.wallet_id, amount: newAmount - existingExpense.total_amount}, session);
    }

    let updateQuery = withSession( expense.findByIdAndUpdate(
      expense_id,
      updatedDetails,
      { new: true, runValidators: true }
    ), session);

    /**
     * this means there is no amount change as well because 
     * if amount changes these will change as well ( but not vice verca )
     */
    if( updatedDetails.lenders === undefined && updatedDetails.borrowers === undefined ) {

      const updatedExpense = await updateQuery;
  
      if (!updatedExpense) throw new ErrorHandler(`update operation failed for expense ${expense_id}`);

      logger.info(`expense ${expense_id} updated`);
      return updatedExpense;
    }

    await revertExpenseEffects({curExpense: existingExpense}, session);

    const updatedExpense = await updateQuery;

    if (!updatedExpense) throw new ErrorHandler(`update operation failed for expense: ${expense_id}`);

    await handleExpenseRelations({
      lender_id: updatedExpense.lenders[0].user_id.toString(),
      total_amount: updatedExpense.total_amount,
      wallet_id: updatedExpense?.wallet_id?.toString(),
      group_id: updatedExpense?.group_id?.toString(),
      borrowers: updatedExpense.borrowers,
    }, session);

    logger.info(`expense ${expense_id} updated`);
    return updatedExpense;
}


/**
 * reverts expense effects
 * @param {string} expense_id 
 * @param {session} session 
 * @returns nothing
 */
export const deleteExpenseService = async (expense_id, session) => {

  const curExpense = await expense.findById(expense_id);

  if (!curExpense) throw new ErrorHandler(`Expense not found: ${expense_id}, cannot delete...`);

  await revertExpenseEffects({ curExpense, zeroTrue: true }, session);

  let deleteQuery = withSession ( expense.findByIdAndDelete(expense_id), session);
  const deletedExpense = await deleteQuery;

  if(!deletedExpense) throw new ErrorHandler(`delete operation failed for expense: ${expense_id}`);
  
  logger.info(`expense ${expense_id} deleted`);
}


/**
 * 
 * @param {string} expense_id 
 * @returns expense with details
 */
export const fetchExpenseDetails = async (expense_id) => {
  const expenseObj = await findExpenseById(expense_id);
  if(!expenseObj) throw new ErrorHandler(`expense not found: ${expense_id}`);

  const curExpense = expenseObj.toObject();

  const lenders = await Promise.all(curExpense.lenders.map(async (lender) => {

    try {
        const user = await findUserById(lender.user_id);
        if (!user) {
            logger.warn(`User not found: ${lender.user_id}, included in expense ${expense_id}`);
        }

        return {
            ...lender,
            lender_name: user?.name || "unknown"
        };
    } catch (error) {
        logger.warn(error);
        return {
            ...lender,
            lender_name: "unknown"
        };
    }
  }));

  const borrowers = await Promise.all(curExpense.borrowers.map(async (borrower) => {

    try {
        const user = await findUserById(borrower.user_id);
        if (!user) {
            logger.warn(`User not found: ${borrower.user_id}, included in expense ${expense_id}`);
        }

        return {
            ...borrower,
            borrower_name: user?.name || "unknown"
        };
    } catch (error) {
        logger.warn(error);
        return {
            ...borrower,
            borrower_name: "unknown"
        };
    }
  }));

  curExpense.lenders = lenders;
  curExpense.borrowers = borrowers;

  return curExpense;
}

/**
 * takes whole end day by setting hours
 * @returns array of expense
 */
export const fetchPeriodExpenses = async ({startDate, endDate, user_id}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const expenses = await findPeriodicExpenses({start, end, userId: user_id});
  return expenses;
}


/**
 * 
 * handles changes by first modifying wallet 
 * then group and then updates users
 * 
 * @param {{lender_id: string, borrowers: Array<object, wallet_id: string, group_id: string, total_amount: number}} param0 
 * @param {session} session
 */
export const handleExpenseRelations = async ({
  lender_id,
  borrowers,
  wallet_id,
  group_id,
  total_amount,
}, session) => {
  try{
    if(!lender_id || borrowers.length === 0) throw new ErrorHandler(`Insuffecient details to handle expense relations`);

    if (wallet_id){
      await modifyWalletBalance({ id: wallet_id, amount: -total_amount }, session);
    }

    if (group_id){
      await distributeAmount({
        groupId: group_id,
        giverId: lender_id,
        borrowers,
      }, session);
    }
      
    await updateFriendlyExchangeStatesOnLending({
      lender_id: lender_id,
      borrowers
    }, session);

    logger.debug(`handled expense relations`);
  }
  catch (error) {
    logger.warn(`expense relations handling error`);
    throw error;
  }
};




/**
 * reverts the effect of earlier expense
 * 
 * @param {{curExpense: object, zeroTrue: boolean}} curExpense 
 * @param {session} session 
 */
export const revertExpenseEffects = async ({ curExpense, zeroTrue }, session) => {

  if (curExpense.wallet_id) {
    await modifyWalletBalance({
      id: curExpense.wallet_id,
      amount: curExpense.total_amount,
      zeroTrue
    }, session);
  }

  for (const borrower of curExpense.borrowers) {
    await handleExpenseRelations({
      lender_id: borrower.user_id.toString(),
      borrowers: [{ user_id: curExpense.lenders[0].user_id.toString(), amount: borrower.amount }],
      group_id: curExpense?.group_id?.toString(),
      total_amount: curExpense.total_amount
    }, session);
  }

};


/**
 * 
 * @param {string} expense_id 
 * @param {session} session 
 * @returns expense
 */
export const findExpenseById = async (expense_id, session) => {

  let query = withSession( expense.findById(expense_id), session);

  const curExpense = await query;
  if(!curExpense) {
    logger.warn(`expense not found: ${expense_id}`);
    return;
  }

  return curExpense;
}


/**
 * sorted by recent first
 * @param {{start: Date, end: Date, userId: string}} param0 
 * @returns array of expense
 */
export const findPeriodicExpenses = async ({start, end, userId}) => {
  const expenses = await expense
    .find({
      $or: [
        { creator_id: userId },
        { "lenders.user_id": userId },
        { "borrowers.user_id": userId },
      ],
      created_at_date_time: { $gte: start, $lte: end },
    })
    .sort({ created_at_date_time: -1 });

  return expenses;
}


/**
 * if user is included in lender or borrower
 * @param {{userId: string, group_id: string}} param0 
 * @returns expense array
 */
export const findUserExpenses = async ({userId, group_id}) => {
  
  let filter = {
    $or: [
      { "lenders.user_id": userId.toString() },
      { "borrowers.user_id": userId.toString() },
    ],
  };

  if (group_id) {
    filter.group_id = group_id;
  }

  const expenses = await expense.find(filter).select("description lenders total_amount created_at_date_time").sort({
    created_at_date_time: -1,
  }).lean();

  const formattedExpenses = await Promise.all(
    expenses.map(async (exp) => {
      try {
          const giver = await user.findById(exp.lenders[0].user_id).select("name");
          if(!giver) {
            logger.error(`user not found ${exp.lenders[0].user_id}, included in expense ${exp._id}`);
          }
          
          const giver_name = exp.lenders[0].user_id.toString() === userId.toString() ? "you" : giver?.name || "unknown";

          return {
              ...exp,
              type: "expense",
              giver: giver_name,
          };
      } catch (error) {
          logger.warn(`Unable to fetch giver ${exp.lenders[0].user_id} in ${exp._id}`);
          return {
            ...exp,
            type: "expense",
            giver: "unknown",
        };
      }
    })
  );

  return formattedExpenses;
}

/**
 * 
 * @param {{description: string, lender_id: string, borrower_id: string, group_id: string, wallet_id: string, min_amount: number, max_amount: number, category: string}} param0 
 * @returns array of expense
 */
export const findCustomExpenses = async ({
  description,
  lender_id,
  borrower_id,
  group_id,
  wallet_id,
  min_amount,
  max_amount,
  category}) => {

    let filter = {};

    if (description) {
      /**
       * Case-insensitive search
       */
      filter.description = { $regex: description, $options: "i" };
    }

    if (lender_id) {
      filter["lenders.user_id"] = lender_id;
    }

    if (borrower_id) {
      filter["borrowers.user_id"] = borrower_id;
    }

    if (group_id) {
      filter.group_id = group_id;
    }

    if (wallet_id) {
      filter.wallet_id = wallet_id;
    }

    if (category) {
      filter.expense_category = category;
    }

    if (min_amount || max_amount) {
      filter.total_amount = {};
      if (min_amount) filter.total_amount.$gte = Number(min_amount);
      if (max_amount) filter.total_amount.$lte = Number(max_amount);
    }

    const expenses = await expense
      .find(filter)
      .sort({ created_at_date_time: -1 });

    return expenses;
}


/**
 * 
 * merges all the borrowers and lenders in a single 
 * array and sends notification to them
 * 
 * @param {{expense: object, active_user_id: string, notification_body: string, notification_title: string}} param0 
 */
export const allExpenseMemberPushNotificationService = async ({expense, active_user_id, notification_body, notification_title}) => {

  const members = [...expense.lenders, ...expense.borrowers];
      
  for (const member of members) {
      if(active_user_id && member.user_id.toString() === active_user_id.toString()) {
          logger.debug(`Skipping active user notification ${active_user_id}`);
          continue;
      }

      try {
          const user = await findUserById(member.user_id);
          if (!user) {
              logger.warn(`User not found: ${member.user_id}`);
              continue;
          }

          const tokens = user.accessTokens || [];
          logger.debug(`Tokens ${tokens?.length}`);
          if(tokens.length === 0) continue;

          for (const token of tokens) {

              try {
                  await addPushJob({token, title: notification_title, body: notification_body});
              } catch (tokenErr) {
                  logger.error(`Failed to ${notification_title} bill push notification`, {
                      userId: member.user_id,
                      token,
                      error: tokenErr.message,
                  });
              }

          }
      } catch (userErr) {
          logger.error(userErr);
          continue;
      }
  }
}


/**
 * Sends push notification for showing a user created settlement
 * 
 * @param {{expense: object, active_user_id: string}} param0
 * @returns nothing if success else throws error
 */
export const sendNewExpensePushNotification = async({expense, active_user_id}) => {
  try{
      const active_user = await findUserById(active_user_id);
      if(!active_user) {
          logger.warn(`user not found ${active_user_id}, terminating push notification for expense creation`);
          return;
      }

      const title = "🔀 New Split";
      let body = `${active_user.name} just added a new split of ₹ ${expense.total_amount}`;

      if(expense.group_id) {
        const active_group = await findGroupById(expense.group_id);
        if(!active_group) {
            logger.warn(`group not found ${expense.group_id}, terminating push notification for expense creation`);
            return;
        }

        body = `${active_user.name} added a new split of ₹ ${expense.total_amount} in ${active_group.group_title}`;
      }

      await allExpenseMemberPushNotificationService({expense, active_user_id, notification_title: title, notification_body: body});
  }
  catch(err){
      throw err;
  }
}

/**
 * 
 * @param {string} expense_id 
 * @returns void
 */
export const deleteExpenseMedia = async (expense_id) => {
  const expenseObj = await findExpenseById(expense_id);
  if (!expenseObj) throw new ErrorHandler(`Expense not found: ${expense_id}, cannot delete media`);

  if (!expenseObj.media || !expenseObj.media.public_id) {
    logger.warn(`No media found for expense ${expense_id}`);
    return;
  }

  try {
    await deleteMedia(expenseObj.media.public_id);
    expenseObj.media = null;
    await expenseObj.save();
    logger.debug(`Media deleted for expense ${expense_id}`);
  } catch (error) {
     throw error;
  }
}