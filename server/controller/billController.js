import ErrorHandler from "../middlewares/error.js";
import bill from "../models/bill.js"
import logger from "../logger/index.js";
import { BillStatus, BillMemberStatus} from "../enums/billEnums.js";
import { createBillService, updateUserBillStatus } from "../services/billService.js";
import { STATUS_CODES, MESSAGES } from "../config/constants.js";

/**
 * 
 * @function createBill
 * To clarify how error are handled in each file, each db operation fail,
 * business logic fail etc, should have an specific
 * message thrown to be able to log and know the error while
 * we should send a generic message to client not exposing
 * technical details and irrelevant info to client
 * @returns response to with new bill creation
 */
export const createBill = async (req, res, next) => {
    try {
        const user_id = req.user._id;
        const bill = await createBillService({...req.body, creator_id: user_id});
        res.status(STATUS_CODES.CREATED).json({message: MESSAGES.RESOURCE_CREATED("Bill"), data: bill});
    } catch (error) {
        next(error);
    }
}


/**
 * 
 * @method handleBillUserStatusUpdate updates user's status
 * in bill
 * @returns response with updated bill
 */
export const handleBillUserStatusUpdate = async (req, res, next) => {
    try {
        const updatedBill = await updateUserBillStatus({
            user_id: req.user.id,
            bill_id: req.params.billId,
            status: req.body.status
        });

        res.status(STATUS_CODES.OK).json({
            message: MESSAGES.RESOURCE_UPDATED("Bill"),
            data: updatedBill
        });
    } catch (error) {
        next(error);
    }
};



export const updateBill = async (req, res, next) => {
    try {
        // only these fields are updated
        // "bill_title": "rent",
        // "bill_category" : "rent",
        // "due_date_time" : "24-2-2025",
        // "recurring" : true
        // members
        // amount
        console.log("Updating Bill");

        const {id} = req.params;
        let updatedDetails = req.body;

        //below code is not temporarily not neccessary due to validation middlewares for now
        // if(updatedDetails.amount) updatedDetails.amount = Number(updatedDetails.amount);

        const updatedBill = await bill.findByIdAndUpdate(id, updatedDetails, {
            new: true,
            runValidators: true
        });

        if(!updatedBill) return next(new ErrorHandler("Error updating bill", 400));

        console.log("Bill updating successfully");
        res.status(200).json({
            message: "Successfully updated bill",
            data: updatedBill
        });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error (E11000)
            return res.status(400).json({
                error:
                "A bill with this title already exists. Please choose a different name.",
            });
        }
        console.log("Error updating bill", error);
        next(error);
    }
}

export const deleteBill = async (req, res, next) => {
    try {
        console.log("Deleting Bill");

        const {id} = req.params;

        await bill.findByIdAndDelete(id);

        console.log("Bill deleted successfully");
        res.status(200).json({
            message: "Successfully deleted bill"
        });
    } catch (error) {
        console.log("Error deleting bill", error);
        next(error);
    }
}


export const getBillById = async (req, res, next) => {
    try {
        console.log("Getting Bill by ID");

        const {id} = req.params;

        const curBill = await bill.findById(id);
        
        if(!curBill) return next(new ErrorHandler("Bill not found",404));

        console.log("Bill fetched successfully");
        res.status(200).json({
            message: "bill fetched successfully",
            data: curBill
        });
    } catch (error) {
        console.log("Error fetching bill by id", error);
        next(error);
    }
}