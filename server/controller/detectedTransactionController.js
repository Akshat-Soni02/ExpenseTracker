import ErrorHandler from "../middlewares/error.js";
import detectedTransaction from "../models/detectedTransaction.js"
import { decryptMessage,extractSMSDetails, encryptMessage } from "../services/detectedTransactionService.js";

export const createAutoTransaction = async(req, res, next) => {
    try {
        console.log("Creating detected transaction");
        const id = req.user._id;
        const {smsMessage} = req.body;
        const encryptedMessage = encryptMessage(smsMessage, process.env.SMS_SECRET_KEY);
        const decryptedMessage = decryptMessage(encryptedMessage, process.env.SMS_SECRET_KEY);
        const details = extractSMSDetails(decryptedMessage);


        
        const newDetectedTransaction = new detectedTransaction({
            transaction_type: details.transaction_type,
            description: details.party,
            from_account: details.transaction_type === "debit" ? details.bank_name + details.account_number : details.party,
            to_account: details.transaction_type === "credit" ? details.bank_name + details.account_number : details.party,
            amount: details.amount,
            user_id: id,
            created_at_date_time: new Date(details.date),
        });

        await newDetectedTransaction.save();
        if(!newDetectedTransaction) return next(new ErrorHandler("Error creating detected transaction",400));
        console.log("Detected transaction created successfully");
        res.status(201).json({
            message: "Detected Transaction created successfully",
            data: newDetectedTransaction
        });
    } catch (error) {
        next(error);
    }
}

export const deleteAutoTransaction = async(req, res, next) => {
    try {
        console.log("Deleting detected transaction");
        const {id} = req.params;
        await detectedTransaction.findByIdAndDelete(id);
        console.log("Detected transaction deleted successfully");
        res.status(200).json({
            message: "Auto transaction deleted Successfully"
        });
    } catch (error) {
        next(error);
    }
}

export const getAutoTransactionById = async (req, res, next) => {
    try {
        console.log("Fetching detected transaction by id");
        const{id} = req.params;
        const curTransaction =  await detectedTransaction.findById(id);
        console.log("Fetched detected transaction by id");
        res.status(200).json({
            message: "Successfully fetched",
            data: curTransaction
        });
    } catch (error) {
        next(error);
    }
}