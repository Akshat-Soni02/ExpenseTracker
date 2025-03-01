import personalTransaction from "../models/personalTransaction.js";

export const findPersonalTransactionById = async (id) => {
    const currPersonalTransaction = await personalTransaction.findById(id);
    if (!currPersonalTransaction) {
        throw new Error("Personal Transaction with this id doesn't exist");
    }
    return currPersonalTransaction;
};

export const findUserPersonalTransactions = async (id) => {
    const transactions = await personalTransaction.find({user_id: id});
    if (!transactions) {
        throw new Error("Error fetching personal transactions for user");
    }
    return transactions;
}

export const findPersonalTransactionByQuery = async (query) => {
    const currPersonalTransaction = await personalTransaction.find(query);
    if(!currPersonalTransaction) throw new Error("Error running query on personal transaction");
    return currPersonalTransaction;
};

export const updatePersonalTransactionType = async (id,transaction_type,amount) => {
    const currPersonalTransaction = await findPersonalTransactionById(id);
    if(transaction_type==="expense"){
        await modifyWalletBalance(currPersonalTransaction.wallet_id,-2*amount);
    }
    else{
        await modifyWalletBalance(currPersonalTransaction.wallet_id,2*amount);
    }
    return true;
};

export const updatePersonalTransactionWallet = async (id,currWallet_id,newWallet_id,amount) => {
    const currPersonalTransaction = await findPersonalTransactionById(id);
    if(currPersonalTransaction.transaction_type==="expense"){
        await transferWalletAmounts(currWallet_id,newWallet_id,amount);
    }
    else{
        await transferWalletAmounts(newWallet_id,currWallet_id,amount);
    }
    return true;
};

export const updatePersonalTransactionAmount = async (id,wallet_id,currAmount,newAmount) => {
    const currPersonalTransaction = await findPersonalTransactionById(id);
    if(currPersonalTransaction.transaction_type==="expense"){
        await modifyWalletBalance(wallet_id, currAmount - newAmount);
    }
    else{
        await modifyWalletBalance(wallet_id, newAmount - currAmount);
    }
    return true;
};



