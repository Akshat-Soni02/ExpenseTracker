import ErrorHandler from "../middlewares/error.js";
import wallet from "../models/wallet.js";

export const createWallet = async (req, res, next) => {
  try {
    // wherever we are sending the array of members to the backend, the members array contains only other ids not the creater one, we will push creator id explicitly in the backend
    const id = req.user._id;
    const { amount, wallet_title, lower_limit, members = [] } = req.body;
    members.push({ user_id: id });

    const newWallet = await wallet.create({
      amount,
      wallet_title,
      lower_limit: lower_limit || 0,
      creator_id: id,
      members: members,
    });

    res.status(201).json({
      success: true,
      wallet: newWallet,
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
    const { id } = req.params;
    const updatedDetails = req.body;
    //send fully updated array of members from client as this code will replace the array completly if new members is present in body
    const updatedWallet = await wallet.findByIdAndUpdate(id, updatedDetails, {
      new: true,
      runValidators: true,
    });

    if (!updatedWallet) {
      return next(new ErrorHandler("Wallet not found", 404));
    }
    res.status(200).json({
      success: true,
      wallet: updateWallet,
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
  // we are simply replacing title to Deleted_Wallet to avoid deleting transactions related to this wallet, don't fetch these wallets in get request
  try {
    const { id } = req.params;
    const deletedWallet = await wallet.findByIdAndUpdate(
      id,
      { wallet_title: "Deleted_Wallet" },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!deletedWallet)
      next(new ErrorHandler("Invalid id to delete wallet", 404));
    res.status(200).json({
      success: true,
      wallet: deleteWallet,
    });
  } catch (error) {
    console.log("Error deleting wallet", error);
    next(error);
  }
};

export const getWalletById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curWallet = await wallet.findById(id);
    if (!curWallet)
      next(new ErrorHandler("Invalid id to get wallet details", 404));
    res.status(200).json({
      success: true,
      wallet: curWallet,
    });
  } catch (error) {
    console.log("Error getting wallet by id", error);
    next(error);
  }
};

export const getUserWallets = async (userId, next) => {
  try {
    const wallets = (await wallet.find({ "members.user_id": userId })) || [];
    return wallets;
  } catch (error) {
    next(error);
  }
};

export const walletsAmountTransfer = async (req, res, next) => {
  // checks
  // amount should be less than amount present in from_account
  // both to and from account should belong to signed user - ignoring this for now
  try {
    const { fromWallet, toWallet } = req.query;
    const { amount } = req.body;
    const debitWallet = await wallet.findById(fromWallet).select("amount");
    const creditWallet = await wallet.findById(toWallet).select("amount");
    if (!debitWallet)
      next(
        new ErrorHandler("from wallet doesn't exist to transfer amount", 404)
      );
    if (amount > debitWallet.amount)
      next(
        new ErrorHandler("Transfer amount is greater than wallet amount", 400)
      );
    await wallet.findByIdAndUpdate(
      fromWallet,
      { amount: debitWallet.amount - amount },
      { runValidators: true }
    );
    await wallet.findByIdAndUpdate(
      toWallet,
      { amount: creditWallet.amount + amount },
      { runValidators: true }
    );
    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log("Error transferring amount from one account to another", error);
    next(error);
  }
};

//this function takes amount with sign = -ve to reduce, +ve to increase
export const modifyWalletBalance = async (walletId, amount, next) => {
  try {
    const curWallet = await wallet.findById(walletId).select("amount");
    if (curWallet.amount + amount < 0)
      next(new ErrorHandler("wallet doesn't have enough balance", 400));
    curWallet.amount = curWallet.amount + amount;
    await curWallet.save();
  } catch (error) {
    next(error);
  }
};
