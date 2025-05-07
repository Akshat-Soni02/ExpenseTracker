import wallet from "../models/wallet.js";

export const findWalletById = async (id) => {
  try {
    if(!id) {
      throw new Error("Missing id to look for wallet");
    }
  
    const curWallet = await wallet.findById(id);
    if (!curWallet) {
        console.log(`Wallet with id: ${id} doesn't exist`);
        return null;
    }
  
    return curWallet;
  } catch (error) {
    console.log(error);
    throw new error;
  }
};

export const transferWalletAmounts = async({toWallet, fromWallet, amount}) => {

  try {
    if(!toWallet || !fromWallet || !amount) {
      console.log(`Details missing to transfer wallet amounts`);
      throw new Error(`Unable to transfer amount, details insuffecient`);
    }

    if(toWallet.toString() === fromWallet.toString()) return {fromWallet, toWallet};

    console.log(`Transfering ${amount} from ${fromWallet} to ${toWallet}`);

    const debitWallet = await findWalletById(fromWallet);
    if (!debitWallet) throw new Error(`Unable to find wallet to debit amount from`);

    const creditWallet = await findWalletById(toWallet);
    if (!creditWallet) throw new Error(`Unable to find wallet to credit amount to`);

    if (amount > debitWallet.amount) return null;

    const updatedDebitWallet = await wallet.findByIdAndUpdate(
      fromWallet,
      { amount: debitWallet.amount - amount },
      { runValidators: true, new: true }
    );

    if(!updatedDebitWallet) throw new Error("Cannot transfer amounts, debit wallet validation fail");
    
    const updatedCreditWallet = await wallet.findByIdAndUpdate(
      toWallet,
      { amount: creditWallet.amount + amount },
      { runValidators: true, new: true }
    );

    if(!updatedCreditWallet) throw new Error("Cannot transfer amounts, credit wallet validation fail");
    return {updatedDebitWallet, updatedCreditWallet};
  } catch (error) {
    console.log(error);
    throw new error;
  }

    
}

//takes amount with sign
export const modifyWalletBalance = async ({id, amount, zeroTrue}) => {
  try {
    console.log(`Modifying Wallet Balance of ${id}`);

    if(!id || !amount) throw new Error(`Insuffecient details, id or amount missing`);

    const curWallet = await wallet.findById(id).select("amount");
    if(!curWallet) throw new Error(`Walled doesn't exist with given id ${id}`);

    if (curWallet.amount + amount < 0) {
      if(zeroTrue) amount = -curWallet.amount;
      else throw new Error("wallet doesn't have enough balance");
    }

    const updatedWallet = await wallet.findByIdAndUpdate(id, {amount: curWallet.amount + amount}, {new: true, runValidators: true});
    if(!updatedWallet) throw new Error(`Unable to update wallet, validation fail`);

    console.log(`Modified Wallet ${id} Balance`);
    return true;
  } catch (error) {
    console.log(error);
    throw new error;
  }
  
};

export const findUserWallets = async (id) => {
  try {
    console.log(`finding user - ${id} wallets`);
    const wallets = await wallet.find({ creator_id: id, deleted: false });
    return wallets;
  } catch (error) {
    console.log(error);
    throw new error;
  }
};

export const sufficientBalance = async ({id, amount}) => {
  try {
    console.log("checking wallet balance");
    if(!id || !amount) throw new Error(`Insuffecient details, id or amount`);

    const curWallet = await wallet.findById(id).select("amount");
    if(!curWallet) throw new Error("Walled doesn't exist with given id");

    if (curWallet.amount - amount >= 0) return true;
    return false;
  } catch (error) {
    console.log(error);
    throw new error;
  }
}
