import { modifyWalletBalance } from "./walletService.js";
import { distributeAmount } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";
import settlement from "../models/settlement.js";

export const handleSettlementRelations = async ({payer_id, receiver_id, amount, group_id}) => {
      console.log("handling settlement relations");
      //Update Group
      if (group_id){
        await distributeAmount({
          groupId: group_id,
          giverId: payer_id,
          borrowers: [{user_id: receiver_id, amount}],
        });}
    
    
      //Update Users friendly state
      await updateFriendlyExchangeStatesOnLending({
        lender_id: payer_id,
        borrowers: [{user_id: receiver_id, amount}],
      });
      console.log("settlement relations handled");
}

export const revertSettlementEffects = async (curSettlement) => {
  try {
    console.log("reverting settlement effects");
    if (curSettlement.payer_wallet_id) {
      await modifyWalletBalance({
        id: curSettlement.payer_wallet_id,
        amount: curSettlement.amount,
      });
    }

    if (curSettlement.receiver_wallet_id) {
      await modifyWalletBalance({
        id: curSettlement.receiver_wallet_id,
        amount: -curSettlement.amount,
        zeroTrue: true
      });
    }

    await handleSettlementRelations({
      payer_id: curSettlement.receiver_id,
      receiver_id: curSettlement.payer_id,
      amount: curSettlement.amount,
      group_id: curSettlement?.group_id,
    });
    console.log("settlement effects reverted");
  } catch (error) {
    console.log("Error reverting settlement", error);
  }
};

export const findSettlementById = async (id) => {
  console.log("finding settlement by id");
  const curSettlement = await settlement.findById(id);
  if (!curSettlement) return null;
  console.log("found settlement by id");
  return curSettlement;
}

export const findUserSettlements = async ({userId, group_id}) => {
  console.log("finding user settlements");
  let filter = {
    $or: [
      { "payer_id": userId },
      { "receiver_id": userId },
    ],
  };

  if (group_id) {
    filter.group_id = group_id; // Filter by group if provided
  }

  const settlements = await settlement.find(filter).sort({
    created_at: -1,
  });
  console.log("found user settlements");
  return settlements;
}

export const findGroupSettlements = async (group_id) => {
  console.log("finding group settlements");
  const settlements = await settlement.find({group_id});
  if (!settlements) return null;
  console.log("found group settlements");
  return settlements;
}

