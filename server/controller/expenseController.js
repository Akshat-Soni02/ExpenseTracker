import {
  findUserExpenses,
  findCustomExpenses,
  createExpenseService,
  updateExpenseService,
  deleteExpenseService,
  fetchExpenseDetails,
  fetchPeriodExpenses,
  updateExpenseMedia,
  detachWallet,
  deleteExpenseMedia
} from "../services/expenseService.js";
import { withTransaction } from "../utils/transaction.js";
import { MESSAGES, STATUS_CODES } from "../config/constants.js";
import logger from "../logger/index.js";


/**
 * 
 * @returns response with new expense
 */
export const createExpense = async (req, res, next) => {
  try {
    let lenders = JSON.parse(req.body.lenders); 
    let borrowers = JSON.parse(req.body.borrowers);

    const file = req.file;

    const user_id = req.user._id;
    const creator = {
      creator_id: user_id,
      amount: req.body.total_amount,
    };

    const newExpense = await withTransaction(async (session) => {
      return await createExpenseService({file, data: {...req.body, creator, lenders, borrowers}}, session);
    });

    res.status(STATUS_CODES.CREATED).json({
      message: MESSAGES.RESOURCE_CREATED("Split"),
      data: newExpense,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with updated expense
 */
export const updateExpense = async (req, res, next) => {

  try {
    const { expense_id } = req.params;
    const file = req.file;
    let updatedDetails = req.body;

    if(updatedDetails.lenders) updatedDetails.lenders = JSON.parse(updatedDetails.lenders);
    if(updatedDetails.borrowers) updatedDetails.borrowers = JSON.parse(updatedDetails.borrowers);
    if(updatedDetails.total_amount) updatedDetails.total_amount = Number(updatedDetails.total_amount);
    

    if (updatedDetails.lenders && typeof updatedDetails.lenders === "string") {
      updatedDetails.lenders = JSON.parse(updatedDetails.lenders);
    }
    if ( updatedDetails.borrowers && typeof updatedDetails.borrowers === "string") {
      updatedDetails.borrowers = JSON.parse(updatedDetails.borrowers);
    }

    if(file) updatedDetails.media = await updateExpenseMedia(file);

    const updatedExpense = await withTransaction(async (session) => {
      return await await updateExpenseService({ expense_id, data: updatedDetails }, session);
    });

    res.status(STATUS_CODES.OK).json({
      message : MESSAGES.RESOURCE_UPDATED("Split"),
      data : updatedExpense,
    });

  } catch (error) {
    next(error);
  }

};



/**
 * 
 * @returns response with no data
 */
export const deleteExpense = async (req, res, next) => {
  try {
    const { expense_id } = req.params;
    
    await withTransaction(async (session) => {
      return await deleteExpenseService(expense_id, session);
    })

    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.DELETED
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with expense reqested
 */
export const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const curExpense = await fetchExpenseDetails(id);

    res.status(STATUS_CODES.OK).json({
      message : MESSAGES.FETCHED("Split"),
      data : curExpense,
    });
  } catch (error) {
    next(error);
  }
};



/**
 * 
 * @returns response with expenses
 */
export const getUserPeriodExpenses = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const expenses = await fetchPeriodExpenses({startDate, endDate, user_id: req.user.id});

    res.status(STATUS_CODES.OK).json({
      message: "Fetched successfully",
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with expenses
 */
export const getUserExpenses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { group_id } = req.query;

    const expenses = await findUserExpenses({userId, group_id});

    res.status(STATUS_CODES.OK).json({
      message: "Splits fetched",
      data : expenses,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with expenses
 */
export const getCustomExpenses = async (req, res, next) => {
  try {
    const expenses = await findCustomExpenses(req.query);

    res.status(STATUS_CODES.OK).json({
      message : "Fetched Successfully",
      data : expenses,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
* @returns response with no data
*/
export const deleteExpensePhoto = async (req, res, next) => {
  try {
    const { expense_id } = req.params;
    await deleteExpenseMedia(expense_id);
    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.DELETED
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * @returns response with no data
 */
export const removeExpenseWallet = async (req, res, next) => {
  try {
    const { expense_id } = req.params;
    await detachWallet(expense_id);

    res.status(STATUS_CODES.OK).json({
      message: "wallet removed"
    });
  } catch (error) {
    next(error);
  }
};
 
// getExpenseByAutoWalletId

