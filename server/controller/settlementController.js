import settlement from "../models/settlement.js";
import ErrorHandler from "../middlewares/error.js";
import { modifyWalletBalance, transferWalletAmounts } from "../services/walletService.js";
import { findSettlementById, findUserSettlements, handleSettlementRelations, revertSettlementEffects } from "../services/settlementService.js";

//settlement can be created in a group, or personally 
//creating a settlement means changing group states, also changing personal states with other people
export const createSettlement = async (req, res, next) => {

  //first we will try to create settlement
  //if successfull we will first change wallet state then group then personal
  try {
    const id = req.user._id;
    let {
      settlement_description,
      payer_wallet_id,
      payer_id,
      receiver_wallet_id,
      receiver_id,
      amount,
      group_id,
      status
    } = req.body;

    //create settlement
    //wallet changes
    //if its group then group changes
    //then personal changes
    console.log(amount);

    if (status === "sent") {
      payer_id = id;
      if (typeof payer_wallet_id !== "undefined") {
        await modifyWalletBalance({id: payer_wallet_id, amount: -amount});
        console.log("Wallet modified");
      }
      await handleSettlementRelations({payer_id, receiver_id, amount, group_id});
    } else if (status === "receiver") {
      receiver_id = id;
      if (typeof receiver_wallet_id !== "undefined") {
        console.log(amount);
        await modifyWalletBalance({id: receiver_wallet_id, amount});
        console.log("Wallet modified");
      }
      console.log(amount);
      await handleSettlementRelations({payer_id, receiver_id, amount, group_id});
    }

    const newSettlement = await settlement.create({
      settlement_description,
      payer_wallet_id,
      payer_id,
      receiver_wallet_id,
      receiver_id,
      amount,
      group_id,
    });

    if(!newSettlement) return next(new ErrorHandler("Error creating new settlement", 400));

    res.status(201).json({
      message : "Settlement created successfully",
      data : newSettlement,
    });
  } catch (error) {
    console.log("Error creating settlement");
    next(error);
  }
};

export const updateSettlement = async (req, res, next) => {
  //inorder to update settlement, first we will find the settlement
  // then if members is not in updates then its alright
  // else we need to revert the earlier settlement and add the new changes in it
  try {

    // we can update these many things
    // settlement_description, media,
    const userId = req.user.id;
    const { id } = req.params;
    const updatedDetails = req.body;

    const existingSettle = await settlement.findById(id);

    if (!existingSettle) {
      return next(new ErrorHandler("Settlement not found with the given id", 404));
    }

    // if (
    //   updatedDetails.payer_id !== undefined ||
    //   updatedDetails.receiver_id !== undefined
    // ) {
    //   await revertSettlementEffects(existingSettle);
    //   const updatedSettle = await settlement.findByIdAndUpdate(
    //     id,
    //     updatedDetails,
    //     { new: true, runValidators: true }
    //   );
    //   if (!updatedSettle)
    //     return next(
    //       new ErrorHandler(
    //         `Cannot update settlement with id: ${existingSettle._id}`,
    //         400
    //       )
    //     );

    //   if(updatedDetails.payer_id !== undefined)
    //   await handleSettlementRelations({
    //     payer_id: updatedSettle.payer_id,
    //     receiver_id: updatedSettle.receiver_id,
    //     amount: updatedSettle.amount,
    //     group_id: updatedSettle?.group_id,
    //   });
    //   res.status(200).json({
    //     message : "Settlement updated successfully",
    //     data : updatedSettle,
    //   });
    //   return;
    // }

    //we will not let user change amount for now

    // const newAmount = updatedDetails.amount === undefined ? existingSettle.amount : updatedDetails.amount;
    // console.log(newAmount);
    // if(userId === existingSettle.payer_id.toString()){
    //   console.log("updating payer wallet id");
    //   if(existingSettle.payer_wallet_id) {
    //     if(updatedDetails.payer_wallet_id) await transferWalletAmounts({toWallet: updatedDetails.payer_wallet_id, fromWallet: existingSettle.payer_wallet_id, amount: newAmount});
    //     else await modifyWalletBalance({id: existingSettle.payer_wallet_id, amount: existingSettle.amount});
    //   }
    //   else await modifyWalletBalance({id: updatedDetails.payer_wallet_id, amount: -newAmount});
    // }
    // if(userId === existingSettle.receiver_id.toString()) {
    //   console.log("updating receiver wallet id");
    //   if(existingSettle.receiver_wallet_id){
    //     if(updatedDetails.receiver_wallet_id) await transferWalletAmounts({toWallet: updatedDetails.receiver_wallet_id, fromWallet: existingSettle.receiver_wallet_id, amount: newAmount});
    //     else await modifyWalletBalance({id: existingSettle.receiver_wallet_id, amount: -existingSettle.amount});
    //   } 
    //   else await modifyWalletBalance({id: updatedDetails.receiver_wallet_id, amount: newAmount});
    // }

    // if(updatedDetails.amount !== undefined && (updatedDetails.payer_wallet_id === undefined && updatedDetails.receiver_wallet_id === undefined)) {

    // }

    const updatedSettle = await settlement.findByIdAndUpdate(
      id,
      updatedDetails,
      { new: true, runValidators: true }
    );
    if (!updatedSettle)
      return next(
        new ErrorHandler(
          `Cannot update settlement with id: ${existingSettle._id}`,
          400
        )
      );

    res.status(200).json({
      message : "Settlement updated successfully",
      data : updatedSettle,
    });
  } catch (error) {
    console.log("Error updating settlement");
  }
};

export const deleteSettlement = async (req, res, next) => {
  try {
    // find the settle
    // revert all changes
    // delete settle

    const { id: settlement_id } = req.params;
    const curSettlement = await settlement.findById(settlement_id);
    if (!curSettlement)
      return next(
        new ErrorHandler(`Cannot delete settlement with id: ${settlement_id}`, 400)
      );

    await revertSettlementEffects(curSettlement);
    const deletedSettlement = await settlement.findByIdAndDelete(settlement_id);

    res.status(200).json({
      message: "Settlement deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting settlement:", error);
    next(error);
  }
};

export const getSettlementById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curSettlement = await findSettlementById(id);

    res.status(200).json({
      message: "Settlement fetched successfully",
      data : curSettlement,
    });
  } catch (error) {
    console.error(`Error getting settlement by Id: ${id}`, error);
    next(error);
  }
};