import ErrorHandler from "../middlewares/error.js";
import detectedTransaction from "../models/detectedTransaction.js"
import { decryptMessage,extractSMSDetails, encryptMessage } from "../services/detectedTransactionService.js";

export const createAutoTransaction = async(req, res, next) => {
    try {
        const id = req.user._id;
        const {smsMessage} = req.body;
        const encryptedMessage = encryptMessage(smsMessage, process.env.SMS_SECRET_KEY);
        console.log(encryptedMessage);
        const decryptedMessage = decryptMessage(encryptedMessage, process.env.SMS_SECRET_KEY);
        console.log("Decrypted:", decryptedMessage);
        const details = extractSMSDetails(decryptedMessage);
        console.log(details);

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
        const {id} = req.params;
        await detectedTransaction.findByIdAndDelete(id);
        res.status(200).json({
            message: "Auto transaction deleted Successfully"
        });
    } catch (error) {
        next(error);
    }
}

export const getAutoTransactionById = async (req, res, next) => {
    try {
        const{id} = req.params;
        const curTransaction =  await detectedTransaction.findById(id);
        res.status(200).json({
            message: "Successfully fetched",
            data: curTransaction
        });
    } catch (error) {
        next(error);
    }
}