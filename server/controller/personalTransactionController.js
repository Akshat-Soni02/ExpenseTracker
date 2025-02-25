import personalTransaction from "../models/personalTransaction.js";
import ErrorHandler from "../middlewares/error.js";
import { uploadMedia } from "./cloudinaryController.js";


//Creating a personaltransaction will change wallet and user
export const createPersonalTransaction = async (req, res, next)=>{
    try {
        const {transaction_type, description, wallet_id, media, transaction_category, notes,amount} = req.body;
        const user_id = req.user._id;
        if (!transaction_type || !description || !wallet_id || !amount) {
            return next(new ErrorHandler("Transaction type, description, amount and wallet id are required", 404));
        }   

        //update wallet

        //update user

        const newPersonalTransaction = await personalTransaction.create({
            transaction_type,
            description,
            wallet_id,
            media,
            transaction_category,
            notes,
            amount,
            user_id,
        });

        res.status(201).json({
            success: true,
            message: "Personal Transaction created successfully",
            budget: newPersonalTransaction,
        });
    }
    catch(error){
        console.error("Error creating budget:", error);
        next(error);
    }
}