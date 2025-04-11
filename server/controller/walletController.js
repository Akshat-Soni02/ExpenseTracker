import ErrorHandler from "../middlewares/error.js";
import wallet from "../models/wallet.js";
import { findWalletById, transferWalletAmounts } from "../services/walletService.js";

export const createWallet = async (req, res, next) => {
  try {
    console.log("Creating wallet");
    // wherever we are sending the array of members to the backend, the members array contains only other ids not the creater one, we will push creator id explicitly in the backend
    const id = req.user._id;
    const { wallet_title, lower_limit, members = []} = req.body;
    // members.push({ user_id: id });
    const amount = Number(req.body.amount);
    const newWallet = await wallet.create({
      amount,
      wallet_title,
      lower_limit: lower_limit || 0,
      creator_id: id,
      // members: members,
    });


    if(!newWallet) return next(new ErrorHandler("Error creating new wallet", 400));
    console.log("Created wallet");
    res.status(201).json({
      message: "Successfully created new wallet",
      data: newWallet,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (E11000)
      return res.status(400).json({
        error:
          "A wallet with this title already exists. Please choose a different name.",
      });
    }
    console.log("Error creating wallet", error);
    next(error);
  }
};

export const updateWallet = async (req, res, next) => {
  try {
    console.log("Updating wallet");
    const { id } = req.params;
    let updatedDetails = req.body;
    updatedDetails.amount = Number(updatedDetails.amount);
    const updatedWallet = await wallet.findByIdAndUpdate(id, updatedDetails, {
      new: true,
      runValidators: true,
    });

    if (!updatedWallet) {
      return next(new ErrorHandler("Wallet not found", 404));
    }
    console.log("Updated wallet");
    res.status(200).json({
      message: "Wallet updated Successfully",
      data: updateWallet,
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (E11000)
      return res.status(400).json({
        error:
          "A wallet with this title already exists. Please choose a different name.",
      });
    }
    console.log("Error updaing wallet", error.message);
    next(error);
  }
};

export const deleteWallet = async (req, res, next) => {
  // we are simply making deleted true to avoid deleting transactions related to this wallet, don't fetch these wallets in get request
  try {
    console.log("Deleting wallet");
    const { id } = req.params;
    const deletedWallet = await wallet.findByIdAndUpdate(
      id,
      { deleted: true },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deletedWallet)
      return next(new ErrorHandler("Invalid id to delete wallet", 404));
    console.log("Deleted wallet");
    res.status(200).json({
      message: "wallet deleted successfully",
      data: deleteWallet,
    });
  } catch (error) {
    console.log("Error deleting wallet", error);
    next(error);
  }
};

export const getWalletById = async (req, res, next) => {
  try {
    console.log("Get wallet by id");
    const { id } = req.params;
    const curWallet = await findWalletById(id);
    
    if (!curWallet) return next(new ErrorHandler("Invalid id to get wallet details", 404));
    console.log("Fetched wallet by id");
    res.status(200).json({
      message: "Wallet fetched successfully",
      data: curWallet,
    });
  } catch (error) {
    console.log("Error getting wallet by id", error);
    next(error);
  }
};

export const walletsAmountTransfer = async (req, res, next) => {
  // checks
  // amount should be less than amount present in from_account
  // both to and from account should belong to signed user - ignoring this for now
  try {
    console.log("Wallet transfer");
    const { fromWallet, toWallet } = req.query;
    let  amount = Number(req.body.amount);
    const transfer = await transferWalletAmounts({toWallet, fromWallet, amount});
    if(!transfer) return next(new ErrorHandler("Transfer amount is greater than wallet amount", 400))
    
    res.status(200).json({
      message:"Successfully transfered amount",
      data: transfer,
    });
  } catch (error) {
    console.log("Error transferring amount from one account to another", error);
    next(error);
  }
};