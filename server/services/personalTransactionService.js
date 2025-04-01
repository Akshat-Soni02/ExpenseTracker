import personalTransaction from "../models/personalTransaction.js";
import { findBudgetByCategory,findBudgetById } from "./budgetService.js";
import { transferWalletAmounts,modifyWalletBalance } from "./walletService.js";

export const findPersonalTransactionById = async (id) => {
    console.log("finding personal transaction by id");
    const currPersonalTransaction = await personalTransaction.findById(id);
    if (!currPersonalTransaction) {
        throw new Error("Personal Transaction with this id doesn't exist");
    }
    console.log("found personal transaction by id");
    return currPersonalTransaction;
};

export const findUserPersonalTransactions = async (id) => {
    console.log("finding personal transactions for user");
    const transactions = await personalTransaction.find({user_id: id});
    if (!transactions) {
        throw new Error("Error fetching personal transactions for user");
    }
    console.log("found personal transactions for user");
    return transactions;
}

export const findPersonalTransactionByQuery = async (query) => {
    console.log("finding personal transaction by query");
    const currPersonalTransaction = await personalTransaction.find(query);
    if(!currPersonalTransaction) throw new Error("Error running query on personal transaction");
    console.log("found personal transaction by query");
    return currPersonalTransaction;
};

export const updatePersonalTransactionType = async (id,transaction_type,amount) => {
    console.log("updating personal transaction type");
    const currPersonalTransaction = await findPersonalTransactionById(id);
    if(transaction_type==="expense"){
        await modifyWalletBalance({id: currPersonalTransaction.wallet_id,amount: -2*amount});
        if(currPersonalTransaction.transaction_category){
                const existingBudget = await findBudgetByCategory(currPersonalTransaction.transaction_category.toString());
                if(existingBudget){
                    existingBudget.current_spend+=amount;
                    await existingBudget.save();
                    currPersonalTransaction.budget_id = existingBudget._id;
                }
            }
        else{
            const existingBudget = await findBudgetByCategory("general");
            if(existingBudget){
                existingBudget.current_spend+=amount;
                await existingBudget.save();
                currPersonalTransaction.budget_id = existingBudget._id;
            }
        }

    }
    else{
        await modifyWalletBalance(currPersonalTransaction.wallet_id,2*amount);
        if(currPersonalTransaction.budget_id){
            const existingBudget = await findBudgetById(currPersonalTransaction.budget_id.toString());
            if(existingBudget){
                existingBudget.current_spend-=amount;
                await existingBudget.save();
                currPersonalTransaction.budget_id = null;
            }
        }
    }
    currPersonalTransaction.save();
    console.log("updated personal transaction type");
    return true;
};

export const updatePersonalTransactionWallet = async (id,currWallet_id,newWallet_id,amount) => {
    console.log("updating personal transaction wallet");
    const currPersonalTransaction = await findPersonalTransactionById(id);
    if(currPersonalTransaction.transaction_type==="expense"){
        await transferWalletAmounts({toWallet: currWallet_id,fromWallet: newWallet_id,amount});
    }
    else{
        await transferWalletAmounts({toWallet:newWallet_id,fromWallet: currWallet_id,amount});
    }
    console.log("updated personal transaction wallet");
    return true;
};

export const updatePersonalTransactionAmount = async (id,wallet_id,currAmount,newAmount) => {
    console.log("updating personal transaction amount");
    const currPersonalTransaction = await findPersonalTransactionById(id);
    if(currPersonalTransaction.transaction_type==="expense"){
        await modifyWalletBalance({id:wallet_id, amount: currAmount - newAmount});
        if(currPersonalTransaction.budget_id){
            const existingBudget = await findBudgetById(currPersonalTransaction.budget_id.toString());
            if(existingBudget){
                existingBudget.current_spend-=currAmount - newAmount;
                await existingBudget.save();
            }
        }
    }
    else{
        await modifyWalletBalance({id: wallet_id, amount: newAmount - currAmount});
    }
    console.log("updated personal transaction amount");
    return true;
};



