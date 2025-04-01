import wallet from "../models/wallet.js";

export const findWalletById = async (id) => {
    const curWallet = await wallet.findById(id);
    if (!curWallet) {
        throw new Error("Wallet with this id doesn't exist");
    }
    return curWallet;
};

export const transferWalletAmounts = async({toWallet, fromWallet, amount}) => {
    console.log("Transfering Wallet Amounts");
    const debitWallet = await findWalletById(fromWallet);
    if (!debitWallet) throw new Error("from wallet doesn't exist to transfer amount");
    const creditWallet = await findWalletById(toWallet);
    if (!creditWallet) throw new Error("to wallet doesn't exist to transfer amount");

    if (amount > debitWallet.amount) return null;
    const fromWalletUpdated = await wallet.findByIdAndUpdate(
      fromWallet,
      { amount: debitWallet.amount - amount },
      { runValidators: true }
    );
    if(!fromWalletUpdated) throw new Error("Error updating from wallet");
    const toWalletUpdated = await wallet.findByIdAndUpdate(
      toWallet,
      { amount: creditWallet.amount + amount },
      { runValidators: true }
    );
    if(!toWalletUpdated) throw new Error("Error updating to wallet");
    console.log("Transfered Wallet Amounts");
    return {fromWalletUpdated, toWalletUpdated};
}

//takes amount with sign
export const modifyWalletBalance = async ({id, amount, zeroTrue}) => {
  console.log("Modifying Wallet Balance");
    const curWallet = await wallet.findById(id).select("amount");
    if(!curWallet) throw new Error(`Walled doesn't exist with given id ${id}`);
    if (curWallet.amount + amount < 0) {
      if(zeroTrue) amount = -curWallet.amount;
      else throw new Error("wallet doesn't have enough balance");
    } 
    await wallet.findByIdAndUpdate(id, {amount: curWallet.amount + amount}, {new: true, runValidators: true});
    console.log("Modified Wallet Balance");
    return true;
};

export const findUserWallets = async (id) => {
  console.log("finding user wallets");
  const wallets = await wallet.find({ creator_id: id, deleted: false });
  if(!wallets) throw new Error("Error fetching user wallets");
  console.log("found user wallets");
  return wallets;
};

export const sufficientBalance = async ({id, amount}) => {
  console.log("checking sufficient balance");
  const curWallet = await wallet.findById(id).select("amount");
  if(!curWallet) throw new Error("Walled doesn't exist with given id");
  if (curWallet.amount - amount >= 0) return true;
  return false;
}