import personalTransaction from "../models/personalTransaction.js";
import wallet from "../models/wallet.js";
import user from "../models/user.js";
import ErrorHandler from "../middlewares/error.js";
// import { uploadMedia } from "./cloudinaryController.js";
import mongoose from "mongoose";
import { findPersonalTransactionById,findPersonalTransactionByQuery,updatePersonalTransactionType,updatePersonalTransactionWallet,updatePersonalTransactionAmount} from "../services/personalTransactionService.js"
import { findWalletById,modifyWalletBalance,transferWalletAmounts } from "../services/walletService.js";
import { findBudgetByCategory,findBudgetById } from "../services/budgetService.js";


//Creating a personaltransaction will change wallet and user
export const createPersonalTransaction = async (req, res, next)=>{
    try {
        const {transaction_type, description, wallet_id, media, transaction_category, notes,amount, created_at_date_time} = req.body;
        const user_id = req.user._id;
        if (!transaction_type || !description || !wallet_id || !amount) {
            return next(new ErrorHandler("Transaction type, description, amount and wallet id are required", 404));
        }   

        //update wallet
        const budget_id = null;
        if(transaction_type==="expense"){
            await modifyWalletBalance({id: wallet_id,amount: -1*amount});
            if(transaction_category){
                const existingBudget = await findBudgetByCategory(transaction_category.toString());
                if(existingBudget){
                    existingBudget.current_spend+=amount;
                    await existingBudget.save();
                    budget_id = existingBudget._id;
                }
            }
            else{
                const existingBudget = await findBudgetByCategory("general");
                if(existingBudget){
                    existingBudget.current_spend+=amount;
                    await existingBudget.save();
                    budget_id = existingBudget._id;
                }
            }
        }
        else{
            await modifyWalletBalance({id:wallet_id,amount});
        }
            

        const newPersonalTransaction = await personalTransaction.create({
            transaction_type,
            description,
            wallet_id,
            media,
            transaction_category,
            notes,
            amount,
            budget_id,
            user_id,
            created_at_date_time
        });

        res.status(201).json({
            message : "Personal Transaction created successfully",
            data : newPersonalTransaction,
        });
    }
    catch(error){
        console.error("Error creating Personal Transaction:", error);
        next(error);
    }
}

export const updatePersonalTransaction = async (req, res, next) => {
    try {
        const { personalTransaction_id } = req.params;
        const { transaction_type, wallet_id,amount,transaction_category } = req.body;
        const updatedDetails = req.body;
        const user_id = req.user._id; 
    
        const existingPersonalTransaction = await findPersonalTransactionById(personalTransaction_id);

        if (!existingPersonalTransaction) {
            return next(new ErrorHandler("Personal Transaction not found", 404));
        }
        if (existingPersonalTransaction.user_id.toString() !== user_id.toString()) {
            return next(new ErrorHandler("Unauthorized to update this Personal Transaction", 403));
        }
    
        // Update only provided fields
        if(existingPersonalTransaction.transaction_type.toString()==="expense"){
            if(transaction_category){
                if(existingPersonalTransaction.budget_id){
                    const existingBudget = await findBudgetById(existingPersonalTransaction.budget_id.toString());
                    if(existingBudget){
                        existingBudget.current_spend-=existingPersonalTransaction.amount;
                        await existingBudget.save();
                    }
                    const newBudget = await findBudgetByCategory(transaction_category.toString());
                    if(newBudget){
                        newBudget.current_spend+=amount;
                        await newBudget.save();
                        updatedDetails.budget_id = newBudget._id;
                    }
                }
            }
            
        }
        if (transaction_type){
            await updatePersonalTransactionType(personalTransaction_id,transaction_type,existingPersonalTransaction.amount);
        }
        
        if (wallet_id){
            await updatePersonalTransactionWallet(personalTransaction_id,existingPersonalTransaction.wallet_id,wallet_id,existingPersonalTransaction.amount);
        }

        if (amount) {
            await updatePersonalTransactionAmount(personalTransaction_id,existingPersonalTransaction.wallet_id, existingPersonalTransaction.amount, amount)
        }
        
        const updatedPersonalTransaction = await personalTransaction.findByIdAndUpdate(personalTransaction_id, updatedDetails, {
            new: true,
            runValidators: true,
          });
    
    
        res.status(200).json({
            message : "Personal Transaction updated successfully",
            data : updatedPersonalTransaction,
        });
        } 
        catch (error) {
            if (error.code === 11000) {
                // Duplicate key error (E11000)
                return res.status(400).json({
                error:
                    "A Personal Transaction with this description already exists. Please choose a different description.",
                });
            }
            console.error("Error updating Personal Transaction:", error);
            next(error);
        }
    };

    export const deletePersonalTransaction = async (req, res, next) => {
        try{
            const { personalTransaction_id } = req.params;
            const user_id = req.user._id; 

            const existingPersonalTransaction = await findPersonalTransactionById(personalTransaction_id);
    
            if (existingPersonalTransaction.user_id.toString() !== user_id.toString()) {
                return next(new ErrorHandler("Unauthorized to delete this Personal Transaction", 403));
            }
            
            if(existingPersonalTransaction.transaction_type==="expense"){
                await modifyWalletBalance(existingPersonalTransaction.wallet_id,existingPersonalTransaction.amount);
            }
            else{
                await modifyWalletBalance(existingPersonalTransaction.wallet_id,-1*existingPersonalTransaction.amount);

            }
            
            if(existingPersonalTransaction.budget_id){
                const existingBudget = await findBudgetById(existingPersonalTransaction.budget_id.toString());
                if(existingBudget){
                    existingBudget.current_spend-=existingPersonalTransaction.amount;
                    await existingBudget.save();
                }
            }
            
            const deletedPersonalTransaction = await existingPersonalTransaction.deleteOne();
    
            res.status(200).json({
                message : "Personal Transaction deleted successfully",
                data : deletedPersonalTransaction,
            });
        }
        catch(error){
            console.error("Error deleting Personal Transaction:", error);
            next(error);
        }
    }

    export const getPersonalTransactionById = async (req, res, next) =>{
        try{
            const {personalTransaction_id} = req.params;
            const user_id = req.user._id; 
            const existingPersonalTransaction = await findPersonalTransactionById(personalTransaction_id);

            if (existingPersonalTransaction.user_id.toString() !== user_id.toString()) {
                return next(new ErrorHandler("Unauthorized to update this Personal Transaction", 403));
            }
    
            res.status(200).json({
                message : "Personal Transaction fetched successfully",
                data : existingPersonalTransaction,
            });
        }
        catch(error){
            console.error("Error getting Personal Transaction by Id:", error);
            next(error);
        }
    }
    
    //get transaction for a particular period and transactiontype
    export const getUserPeriodTypeTransactions = async (req, res, next) => {
        try {
            const { start_date, end_date, transaction_type } = req.body;
            const user_id = req.user._id;
    
            if (!start_date || !end_date) {
                return next(new ErrorHandler("Start date and end date are required", 400));
            }
            
            const query = {
                user_id: new mongoose.Types.ObjectId(user_id),
                created_at_date_time: {
                    $gte: new Date(start_date),
                    $lte: new Date(end_date)
                }
            };
    
            if (transaction_type) {
                query.transaction_type = transaction_type;
            }
    
            const transactions = await findPersonalTransactionByQuery(query);
    
            res.status(200).json({
                message : "User Period Type Transactions fetched successfully",
                data : transactions,
            });
        } catch (error) {
            console.error("Error fetching transactions by timeframe:", error);
            next(error);
        }
    };
    