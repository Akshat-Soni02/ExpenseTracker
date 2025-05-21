import { modifyWalletBalance } from "./walletService.js";
import { distributeAmount } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";
import settlement from "../models/settlement.js";

export const handleSettlementRelations = async ({payer_id, receiver_id, amount, group_id}) => {
    try{  
      console.log("handling settlement relations");

      if(!amount || !payer_id || !receiver_id){
        console.log("Payer ID, receiver ID, or amount is undefined");
        throw new Error("Payer id, receiver id, or amount is undefined");
      }

      //Update Group
      if (group_id){
        await distributeAmount({
          groupId: group_id,
          giverId: payer_id,
          borrowers: [{user_id: receiver_id, amount}],
        });
      }
    
    
      //Update Users friendly state
      await updateFriendlyExchangeStatesOnLending({
        lender_id: payer_id,
        borrowers: [{user_id: receiver_id, amount}],
      });

    }
    catch (error) {
      console.log("Error handling settlement relations", error);
      throw error;
    }
}

export const revertSettlementEffects = async (curSettlement) => {
  try {
    console.log("reverting settlement effects");

    if (!curSettlement) {
      console.log("Settlement is undefined");
      throw new Error("Settlement is undefined");
    }

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

  } catch (error) {
    console.log("Error reverting settlement", error);
    throw error;
  }
};

export const findSettlementById = async (id) => {
  try{  
    console.log("finding settlement by id");

    if(!id) {
      console.log(`Settlement id is undefined: ${id}`);
      throw new Error(`Settlement id is undefined: ${id}`);
    }

    const curSettlement = await settlement.findById(id);
    return curSettlement;
  }
  catch (error) {
    console.log("Error finding settlement by id", error);
    throw new Error("Error finding settlement by id");
  }
}

export const findUserSettlements = async ({userId, group_id}) => {
  try{  
    console.log("finding user settlements");

    if(!userId) {
      console.log(`User id is undefined: ${userId}`);
      throw new Error(`User id is undefined: ${userId}`);
    }

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
  catch (error) {
    console.log("Error finding user settlements", error);
    throw new Error("Error finding user settlements");
  }
}

export const findGroupSettlements = async (group_id) => {
  try{
    console.log("finding group settlements");

    if(!group_id) {
      console.log(`Group id is undefined: ${group_id}`);
      throw new Error(`Group id is undefined: ${group_id}`);
    }

    const settlements = await settlement.find({group_id});
    return settlements;
  }
  catch (error) {
    console.log("Error finding group settlements", error);
    throw new Error("Error finding group settlements");
  }
}
