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
    console.log("Creating settlement");
    const id = req.user._id;
    let {
      settlement_description,
      payer_wallet_id,
      payer_id,
      receiver_wallet_id,
      receiver_id,
      group_id,
      status,
    } = req.body;
    //create settlement
    //wallet changes
    //if its group then group changes
    //then personal changes
    let amount = Number(req.body.amount);
    if (status === "sent") {
      payer_id = id;
      if (typeof payer_wallet_id !== "undefined") {
        await modifyWalletBalance({id: payer_wallet_id, amount: amount*-1});
      }
      await handleSettlementRelations({payer_id, receiver_id, amount, group_id});
    } else if (status === "receiver") {
      receiver_id = id;
      if (typeof receiver_wallet_id !== "undefined") {
        await modifyWalletBalance({id: receiver_wallet_id, amount});
      }
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
    console.log("Created settlement");
    res.status(201).json({
      message : "Settlement created successfully",
      data : newSettlement,
    });
  } catch (error) {
    console.log("Error creating settlement:",error);
    next(error);
  }
};

export const updateSettlement = async (req, res, next) => {
  //inorder to update settlement, first we will find the settlement
  // then if members is not in updates then its alright
  // else we need to revert the earlier settlement and add the new changes in it
  try {
    console.log("Updating settlement");

    // we can update these many things
    // settlement_description, media,
    const userId = req.user.id;
    const { id } = req.params;
    let updatedDetails = req.body;
    updatedDetails.amount = Number(updatedDetails.amount);
    let existingSettle = await settlement.findById(id);
    existingSettle.amount = Number(existingSettle.amount);
    if (!existingSettle) {
      return next(new ErrorHandler("Settlement not found with the given id", 404));
    }

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
    console.log("Updating settlement");
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
    console.log("Deleting settlement");
    const { id: settlement_id } = req.params;
    let curSettlement = await settlement.findById(settlement_id);
    curSettlement.amount = Number(curSettlement.amount);
    if (!curSettlement)
      return next(
        new ErrorHandler(`Cannot delete settlement with id: ${settlement_id}`, 400)
      );

    await revertSettlementEffects(curSettlement);
    const deletedSettlement = await settlement.findByIdAndDelete(settlement_id);
    console.log("Deleted settlement");
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
    console.log("Fetching settlement by id");
    const { id } = req.params;
    const curSettlement = await findSettlementById(id);
    console.log("Fetched settlement by id");
    res.status(200).json({
      message: "Settlement fetched successfully",
      data : curSettlement,
    });
  } catch (error) {
    console.error(`Error getting settlement by Id: ${id}`, error);
    next(error);
  }
};