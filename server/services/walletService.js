import wallet from "../models/wallet.js";

export const findWalletById = async (id) => {
    const curWallet = await wallet.findById(id);
    if (!curWallet) {
        throw new Error("Wallet with this id doesn't exist");
    }
    return curWallet;
};

export const transferWalletAmounts = async({toWallet, fromWallet, amount}) => {
    const debitWallet = await findWalletById(fromWallet);
    const creditWallet = await findWalletById(toWallet);
    if (!debitWallet) throw new Error("from wallet doesn't exist to transfer amount");
    if (amount > debitWallet.amount) return null;
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
    return true;
}

//takes amount with sign
export const modifyWalletBalance = async ({id, amount}) => {
    const curWallet = await wallet.findById(id).select("amount");
    if (curWallet.amount + amount < 0) throw new Error("wallet doesn't have enough balance");
    await wallet.findByIdAndUpdate(id, {amount: curWallet.amount + amount}, {new: true, runValidators: true});
    return true;
};

export const findUserWallets = async (id) => {
  try {
    const wallets = (await wallet.find({ "members.user_id": id, deleted: false })) || [];
    return wallets;
  } catch (error) {
    console.log("Error getting user wallets");
  }
};