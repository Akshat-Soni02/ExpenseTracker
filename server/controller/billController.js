import ErrorHandler from "../middlewares/error.js";
import logger from "../logger/index.js";
import { createBillService, updateUserBillStatus, updateBillService, deleteBillService, fetchBillDetails } from "../services/billService.js";
import { STATUS_CODES, MESSAGES } from "../config/constants.js";

/**
 * 
 * @function createBill
 * @returns response with new bill creation
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


/**
 * 
 * The fields currently we allow to update
 * are bill_title, bill_category, due_date_time,
 * recurring, members, amount
 * @returns response with updated bill
 */
export const updateBill = async (req, res, next) => {
    try {

        const updatedBill = await updateBillService({
            bill_id: req.params.id,
            data: req.body
        });
        
        res.status(STATUS_CODES.OK).json({
            message: MESSAGES.RESOURCE_UPDATED("Bill"),
            data: updatedBill
        });
    } catch (error) {
        next(error);
    }
}


/**
 * 
 * Simply deletes a bill
 * @returns only message no data
 */
export const deleteBill = async (req, res, next) => {
    try {
        await deleteBillService({
            bill_id: req.params.id,
            user_id: req.user.id
        });
        
        res.status(STATUS_CODES.OK).json({
            message: MESSAGES.DELETED
        });
    } catch (error) {
        next(error);
    }
}


/**
 * 
 * Fetches bill for client
 * @returns response with fetched bill
 */
export const getBillById = async (req, res, next) => {
    try {
        const bill = await fetchBillDetails(req.params.id);
        
        if(!bill) throw new ErrorHandler(`Client get operation failed on bill: ${req.params.id}`, STATUS_CODES.SERVER_ERROR);
        logger.debug(bill);

        logger.info(`Bill ${req.params.id} fetched for ${req.user.id}`);
        res.status(STATUS_CODES.OK).json({
            message: MESSAGES.FETCHED("Bill"),
            data: bill
        });
    } catch (error) {
        next(error);
    }
}