import personalTransaction from "../models/personalTransaction.js";
import { findBudgetByCategory,findBudgetById } from "./budgetService.js";
import { transferWalletAmounts,modifyWalletBalance } from "./walletService.js";

export const findPersonalTransactionById = async (id) => {
    try{    
        console.log("finding personal transaction by id");
        if(!id) {
            console.log(`Personal transaction id is undefined: ${id}`);
            throw new Error(`Personal transaction id is undefined: ${id}`);
        }
        const currPersonalTransaction = await personalTransaction.findById(id);
        return currPersonalTransaction;
    }
    catch (error) {
        console.log("Error finding personal transaction by id", error);
        throw new Error("Error finding personal transaction by id");
    }
};

export const findUserPersonalTransactions = async (id) => {
    try{    
        console.log("finding personal transactions for user");
        if(!id) {
            console.log(`User id is undefined: ${id}`);
            throw new Error(`User id is undefined: ${id}`);
        }
        const transactions = await personalTransaction.find({user_id: id});
        return transactions;
    }
    catch (error) {
        console.log("Error finding personal transactions for user", error);
        throw new Error("Error finding personal transactions for user");
    }
}

export const findPersonalTransactionByQuery = async (query) => {
    try{    
        console.log("finding personal transaction by query");
        if(!query) {
            console.log(`Query is undefined: ${query}`);
            throw new Error(`Query is undefined: ${query}`);
        }
        const currPersonalTransaction = await personalTransaction.find(query);
        return currPersonalTransaction;
    }
    catch (error) {
        console.log("Error finding personal transaction by query", error);
        throw new Error("Error finding personal transaction by query");
    }
};

export const updatePersonalTransactionType = async (id,transaction_type,amount) => {
    try{    
        console.log("updating personal transaction type");
        if(!id || !transaction_type || !amount) {
            console.log(`Id, transaction type or amount is undefined: ${id}, ${transaction_type}, ${amount}`);
            throw new Error(`Id, transaction type or amount is undefined: ${id}, ${transaction_type}, ${amount}`);
        }
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
        return true;
    }
    catch (error) {
        console.log("Error updating personal transaction type", error);
        throw new Error("Error updating personal transaction type");
    }
};

export const updatePersonalTransactionWallet = async (id,currWallet_id,newWallet_id,amount) => {
    try{    
        console.log("updating personal transaction wallet");
        if(!id || !currWallet_id || !newWallet_id || !amount) {
            console.log(`Id, current wallet id, new wallet id or amount is undefined: ${id}, ${currWallet_id}, ${newWallet_id}, ${amount}`);
            throw new Error(`Id, current wallet id, new wallet id or amount is undefined: ${id}, ${currWallet_id}, ${newWallet_id}, ${amount}`);
        }
        const currPersonalTransaction = await findPersonalTransactionById(id);
        if(currPersonalTransaction.transaction_type==="expense"){
            await transferWalletAmounts({toWallet: currWallet_id,fromWallet: newWallet_id,amount});
        }
        else{
            await transferWalletAmounts({toWallet:newWallet_id,fromWallet: currWallet_id,amount});
        }
        return true;
    }
    catch (error) {
        console.log("Error updating personal transaction wallet", error);
        throw new Error("Error updating personal transaction wallet");
    }
};

export const updatePersonalTransactionAmount = async (id,wallet_id,currAmount,newAmount) => {
    try{    
        console.log("updating personal transaction amount");
        if(!id || !wallet_id || !currAmount || !newAmount) {
            console.log(`Id, wallet id, current amount or new amount is undefined: ${id}, ${wallet_id}, ${currAmount}, ${newAmount}`);
            throw new Error(`Id, wallet id, current amount or new amount is undefined: ${id}, ${wallet_id}, ${currAmount}, ${newAmount}`);
        }
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
        return true;
    }
    catch (error) {
        console.log("Error updating personal transaction amount", error);
        throw new Error("Error updating personal transaction amount");
    }
};



