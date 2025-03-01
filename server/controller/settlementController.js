import settlement from "../models/settlement.js";
import ErrorHandler from "../middlewares/error.js";
import { modifyWalletBalance } from "../services/walletService.js";
import { findSettlementById, findUserSettlements, handleSettlementRelations, revertSettlementEffects } from "../services/settlementService.js";

//settlement can be created in a group, or personally 
//creating a settlement means changing group states, also changing personal states with other people
export const createSettlement = async (req, res, next) => {

  //first we will try to create settlement
  //if successfull we will first change wallet state then group then personal
  try {
    const id = req.user._id;
    const { status } = req.query;
    let {
      settlement_description,
      payer_wallet_id,
      payer_id,
      receiver_wallet_id,
      receiver_id,
      amount,
      group_id,
    } = req.body;

    //create settlement
    //wallet changes
    //if its group then group changes
    //then personal changes

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

    if (status === "sent") {
      payer_id = id;
      if (typeof payer_wallet_id !== "undefined") {
        await modifyWalletBalance({payer_wallet_id, amount: -amount});
        console.log("Wallet modified");
      }
      await handleSettlementRelations({payer_id, receiver_id, amount, group_id});
    } else if (status === "receiver") {
      receiver_id = id;
      if (typeof receiver_wallet_id !== "undefined") {
        await modifyWalletBalance({receiver_wallet_id, amount});
        console.log("Wallet modified");
      }
      await handleSettlementRelations({payer_id: receiver_id, receiver_id: payer_id, amount, group_id});
    }

    res.status(201).json({
      success: true,
      settlement: newSettlement,
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
    // settlement_description, media, payer_wallet_id, receiver_wallet_id, payer_id, receiver_id, amount 
    const { id } = req.params;
    const updatedDetails = req.body;

    const existingSettle = await settlement.findById(id);

    if (!existingSettle) {
      return next(new ErrorHandler("Settlement not found with the given id", 404));
    }

    if (
      updatedDetails.payer_id !== undefined ||
      updatedDetails.receiver_id !== undefined
    ) {
      await revertSettlementEffects(existingSettle);
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
      await handleSettlementRelations({
        payer_id: updatedSettle.payer_id,
        receiver_id: updatedSettle.receiver_id,
        amount: updatedSettle.amount,
        group_id: updatedSettle?.group_id,
      });
      res.status(200).json({
        success: true,
        settlement: updatedSettle,
      });
      return;
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

    res.status(200).json({
      success: true,
      settlement: updatedSettle,
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

    const { settlement_id } = req.params;
    const curSettlement = await settlement.findById(settlement_id);
    if (!curSettlement)
      return next(
        new ErrorHandler(`Cannot delete settlement with id: ${settlement_id}`, 400)
      );

    await revertSettlementEffects(curSettlement);
    await settlement.findByIdAndDelete(settlement_id);

    res.status(200).json({
      success: true,
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
      success: true,
      settlement: curSettlement,
    });
  } catch (error) {
    console.error(`Error getting settlement by Id: ${id}`, error);
    next(error);
  }
};


export const getUserSettlements = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { group_id } = req.query; // Optional Group ID

    const settlements = await findUserSettlements({userId, group_id});

    res.status(200).json({
      success: true,
      settlements,
    });
  } catch (error) {
    console.error("Error fetching user settlements", error);
    next(error);
  }
};