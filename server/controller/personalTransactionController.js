import ErrorHandler from "../middlewares/error.js";
import { findPersonalTransactionById, createPersonalService, updatePersonalService, deletePersonalService, fetchPeriodTransactions,deletePersonalTransactionMedia} from "../services/personalTransactionService.js"
import { withTransaction } from "../utils/transaction.js";
import { MESSAGES, STATUS_CODES } from "../config/constants.js";


/**
 * 
 * 
 * @returns response with transaction
 */
export const createPersonalTransaction = async (req, res, next)=>{
    try {
        const file = req.file;
        const user_id = req.user._id;
        
        const newPersonal = await withTransaction(async (session) => {
            return await createPersonalService({file, data: {...req.body, user_id}}, session);
        })

        return res.status(STATUS_CODES.CREATED).json({
            message : MESSAGES.RESOURCE_CREATED("Transaction"),
            data : newPersonal,
        });
    }
    catch(error){
        next(error);
    }
}


/**
 * 
 * @todo media upload yet to handle
 * 
 * updates details except media
 */
export const updatePersonalTransaction = async (req, res, next) => {
    try {
        const { personalTransaction_id } = req.params;
    
        const updatedPersonalTransaction = await withTransaction (async (session) => {
            return await updatePersonalService({ personalTransaction_id, data: req.body}, session);
        })

        res.status(STATUS_CODES.OK).json({
            message : MESSAGES.RESOURCE_UPDATED("Transaction"),
            data : updatedPersonalTransaction,
        });
    } 
    catch (error) {
        next(error);
    }
};



/**
 * 
 * reverts the data and then deletes
 * @returns response with no data
 */
export const deletePersonalTransaction = async (req, res, next) => {
    try{
        const { personalTransaction_id } = req.params;

        await withTransaction(async (session) => {
            return await deletePersonalService(personalTransaction_id, session);
        })

        res.status(STATUS_CODES.OK).json({
            message : MESSAGES.DELETED,
        });
    }
    catch(error){
        next(error);
    }
}



/**
 * 
 * @returns personal transaction with default details
 */
export const getPersonalTransactionById = async (req, res, next) =>{
    try{
        const { personalTransaction_id } = req.params;

        const existingPersonalTransaction = await findPersonalTransactionById(personalTransaction_id);
        if(!existingPersonalTransaction) throw new ErrorHandler(`personal transaction ${personalTransaction_id} not found to fetch details`);
        
        res.status(STATUS_CODES.OK).json({
            message : MESSAGES.FETCHED("Transactions"),
            data : existingPersonalTransaction,
        });
    }
    catch(error){
        next(error);
    }
}



/**
 * 
 * @returns response with array of transaction
 */
export const getUserPeriodTypeTransactions = async (req, res, next) => {
    try {
        const { start_date, end_date, transaction_type } = req.body;
        const user_id = req.user._id;
        
        const transactions = await fetchPeriodTransactions({start_date, end_date, transaction_type, user_id});

        res.status(STATUS_CODES.OK).json({
            message : "Transactions fetched",
            data : transactions,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * 
 *  @returns response with no data 
 */
export const deletePersonalTransactionPhoto = async (req, res, next) => {
  try {
    const { personalTransaction_id } = req.params;
    await deletePersonalTransactionMedia(personalTransaction_id);
    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.DELETED
    });
  } catch (error) {
    next(error);
  }
};