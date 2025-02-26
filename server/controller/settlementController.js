import settlement from "../models/settlement.js";
import ErrorHandler from "../middlewares/error.js";
import { modifyWalletBalance } from "../services/walletService.js";

//settlement can be created in a group, or personally 
//creating a settlement means changing group states, also changing personal states with other people
export const createSettlement = async (req, res, next) => {
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

    //first wallet changes
    //if its group then group changes
    //then personal changes
    //then create settlement

    if (status === "sent") {
      payer_id = id;
      if (typeof payer_wallet_id !== "undefined") {
        await modifyWalletBalance({payer_wallet_id, amount: -amount});
      }
    } else if (status === "receiver") {
      receiver_id = id;
      if (typeof receiver_wallet_id !== "undefined") {
        await modifyWalletBalance({receiver_wallet_id, amount});
      }
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
  try {
    const { id } = req.params;
    const { settlement_description, amount } = req.body;

    const curSettlement = await settlement.findById(id);
    if (typeof settlement_description !== undefined) {
    }
    if (typeof amount !== undefined) {
    }
  } catch (error) {}
};
