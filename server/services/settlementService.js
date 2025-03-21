import { modifyWalletBalance } from "./walletService.js";
import { distributeAmount } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";
import settlement from "../models/settlement.js";

export const handleSettlementRelations = async ({payer_id, receiver_id, amount, group_id}) => {
    
      //Update Group
      if (group_id){
        console.log("HEREGROUP::",group_id);
        await distributeAmount({
          groupId: group_id,
          giverId: payer_id,
          borrowers: [{user_id: receiver_id, amount}],
        });}
    
      console.log("group modified");
    
      //Update Users friendly state
      await updateFriendlyExchangeStatesOnLending({
        lender_id: payer_id,
        borrowers: [{user_id: receiver_id, amount}],
      });
}

export const revertSettlementEffects = async (curSettlement) => {
  try {
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

    console.log("Successfully reverted the settlement with id", curSettlement._id);
  } catch (error) {
    console.log("Error reverting settlement", error);
  }
};

export const findSettlementById = async (id) => {
  const curSettlement = await settlement.findById(id);
  if (!curSettlement) return null;
  return curSettlement;
}

export const findUserSettlements = async ({userId, group_id}) => {
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

  return settlements;
}

export const findGroupSettlements = async (group_id) => {
  const settlements = await settlement.find({group_id});
  if (!settlements) return null;
  return settlements;
}

