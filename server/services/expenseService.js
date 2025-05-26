import expense from "../models/expense.js";
import { modifyWalletBalance } from "./walletService.js";
import { distributeAmount } from "./groupService.js";
import { updateFriendlyExchangeStatesOnLending } from "./userService.js";
import ErrorHandler from "../middlewares/error.js";
import logger from "../logger/index.js";
import { withSession } from "../utils/transaction.js";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import { findUserById } from "./userService.js";


/**
 * 
 * first uploads media if there is 
 * then changes respective datas
 * 
 * @param {{file: string, data: object}} param0 
 * @param {session} session 
 * @returns new expense
 */
export const createExpenseService = async ({file, data}, session) => {

  let media = null;

  if(file) {
    const today = new Date().toISOString().split('T')[0];

    const mediaPath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    const publicId = `expense/${uuidv4()}/${today}`;

    const result = await uploadMedia(mediaPath, "expenseMedia", publicId);

    media = {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  const { lenders, total_amount, wallet_id, group_id, borrowers } = data;

  await handleExpenseRelations({
    lender_id: lenders[0].user_id,
    total_amount,
    wallet_id,
    group_id,
    borrowers,
  }, session);

  const doc = await expense.create([data], {session});
  const newExpense = doc[0];
  if (!newExpense) throw new ErrorHandler(`Create operation failed for expense`);

  logger.info(`Expense ${newExpense._id} created by ${data.creator.creator_id}`);
  return newExpense
}


/**
 * 
 * 
 * @param {{expense_id: string, data: object}} param0 
 * @param {session} session 
 * @returns updated expense
 */
export const updateExpenseService = async ({expense_id, data}, session) => {

    const updatedDetails = data;

    let existingExpense = await findExpenseById(expense_id, session);

    if (!existingExpense) throw new ErrorHandler(`expense not found: ${expense_id}, cannot update expense`);

    /**
     * cases with wallet - 
     * c-1 earlier there was a wallet and now wallet is removed
     * c-2 earlier there was no wallet and now wallet is added
     * c-3 earlier there was a wallet and now wallet is updated
     * c-3 no wallet update (1. there is a wallet earlier, 2. there is no wallet earlier)
     */
    let newAmount = updatedDetails.total_amount !== undefined ? updatedDetails.total_amount : existingExpense.total_amount;

    /**
     * @todo c-1 is not implemented yet
     * 
     * considering we only get wallet_id in 
     * updated details when its altered from earlier 
     * state (c-2, c-3) res
     */

    /**
     * this handles c-2 and c-3
     */
    if(updatedDetails.wallet_id !== undefined) {

      if(!sufficientBalance({id: updatedDetails.wallet_id, amount: newAmount})) {
        throw new ErrorHandler(`Insuffecient wallet balance`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});
      }

      /**
       * since the revert effect doesn't take 
       * care of new wallet balance updates we need to
       * perform here
       */
      await modifyWalletBalance({id: updatedDetails.wallet_id, amount: -1*newAmount}, session);

      /**
       * this handles c-3 (there is a wallet earlier)
       * (here another case c-1 could be possible in which case we need to
       * redeposit money in wallet but @todo need to update this function later 
       * according to frontend response)
       */
    } else if(existingExpense.wallet_id) {

      if(!sufficientBalance({id: updatedDetails.wallet_id, amount: newAmount - existingExpense.total_amount})) {
        throw new ErrorHandler(`Insuffecient wallet balance`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});
      }

      /**
       * we are putting difference in the wallet,
       * the revert effect will take out the earlier amount and hence 
       * things will balance out
       */

      await modifyWalletBalance({id: existingExpense.wallet_id, amount: newAmount - existingExpense.total_amount}, session);
    }

    let updateQuery = withSession( expense.findByIdAndUpdate(
      expense_id,
      updatedDetails,
      { new: true, runValidators: true }
    ), session);

    /**
     * this means there is no amount change as well because 
     * if amount changes these will change as well ( but not vice verca )
     */
    if( updatedDetails.lenders === undefined && updatedDetails.borrowers === undefined ) {

      const updatedExpense = await updateQuery;
  
      if (!updatedExpense) throw new ErrorHandler(`update operation failed for expense ${expense_id}`);

      logger.info(`expense ${expense_id} updated`);
      return updatedExpense;
    }

    await revertExpenseEffects(existingExpense, session);

    const updatedExpense = await updateQuery;

    if (!updatedExpense) throw new ErrorHandler(`update operation failed for expense: ${expense_id}`);

    await handleExpenseRelations({
      lender_id: updatedExpense.lenders[0].user_id.toString(),
      total_amount: updatedExpense.total_amount,
      wallet_id: updatedExpense?.wallet_id?.toString(),
      group_id: updatedExpense?.group_id?.toString(),
      borrowers: updatedExpense.borrowers,
    }, session);

    logger.info(`expense ${expense_id} updated`);
    return updatedExpense;
}


/**
 * reverts expense effects
 * @param {string} expense_id 
 * @param {session} session 
 * @returns nothing
 */
export const deleteExpenseService = async (expense_id, session) => {

  const curExpense = await expense.findById(expense_id);

  if (!curExpense) throw new ErrorHandler(`Expense not found: ${expense_id}, cannot delete...`);

  await revertExpenseEffects(curExpense, session);

  let deleteQuery = withSession ( expense.findByIdAndDelete(expense_id), session);
  const deletedExpense = await deleteQuery;

  if(!deletedExpense) throw new ErrorHandler(`delete operation failed for expense: ${expense_id}`);
  
  logger.info(`expense ${expense_id} deleted`);
}


/**
 * 
 * @param {string} expense_id 
 * @returns expense with details
 */
export const fetchExpenseDetails = async (expense_id) => {
  const expenseObj = await findExpenseById(expense_id);
  if(!expenseObj) throw new ErrorHandler(`expense not found: ${expense_id}`);

  const curExpense = expenseObj.toObject();

  const lenders = await Promise.all(curExpense.lenders.map(async (lender) => {

    try {
        const user = await findUserById(lender.user_id);
        if (!user) {
            logger.warn(`User not found: ${lender.user_id}, included in expense ${expense_id}`);
        }

        return {
            ...lender,
            lender_name: user?.name || "unknown"
        };
    } catch (error) {
        logger.warn(error);
        return {
            ...lender,
            lender_name: "unknown"
        };
    }
  }));

  const borrowers = await Promise.all(curExpense.borrowers.map(async (borrower) => {

    try {
        const user = await findUserById(borrower.user_id);
        if (!user) {
            logger.warn(`User not found: ${borrower.user_id}, included in expense ${expense_id}`);
        }

        return {
            ...borrower,
            borrower_name: user?.name || "unknown"
        };
    } catch (error) {
        logger.warn(error);
        return {
            ...borrower,
            borrower_name: "unknown"
        };
    }
  }));

  curExpense.lenders = lenders;
  curExpense.borrowers = borrowers;

  return curExpense;
}

/**
 * takes whole end day by setting hours
 * @returns array of expense
 */
export const fetchPeriodExpenses = async ({startDate, endDate, user_id}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const expenses = await findPeriodicExpenses({start, end, userId: user_id});
  return expenses;
}


/**
 * 
 * handles changes by first modifying wallet 
 * then group and then updates users
 * 
 * @param {{lender_id: string, borrowers: Array<object, wallet_id: string, group_id: string, total_amount: number}} param0 
 * @param {session} session
 */
export const handleExpenseRelations = async ({
  lender_id,
  borrowers,
  wallet_id,
  group_id,
  total_amount,
}, session) => {
  try{
    if(!lender_id || borrowers.length === 0) throw new ErrorHandler(`Insuffecient details to handle expense relations`);

    if (wallet_id){
      await modifyWalletBalance({ id: wallet_id, amount: -total_amount }, session);
    }

    if (group_id){
      await distributeAmount({
        groupId: group_id,
        giverId: lender_id,
        borrowers,
      }, session);
    }
      
    await updateFriendlyExchangeStatesOnLending({
      lender_id: lender_id,
      borrowers
    }, session);

    logger.debug(`handled expense relations`);
  }
  catch (error) {
    logger.warn(`expense relations handling error`);
    throw error;
  }
};




/**
 * reverts the effect of earlier expense
 * 
 * @param {object} curExpense 
 * @param {session} session 
 */
export const revertExpenseEffects = async (curExpense, session) => {

  if (curExpense.wallet_id) {
    await modifyWalletBalance({
      id: curExpense.wallet_id,
      amount: curExpense.total_amount,
    }, session);
  }

  for (const borrower of curExpense.borrowers) {
    await handleExpenseRelations({
      lender_id: borrower.user_id.toString(),
      borrowers: [{ user_id: curExpense.lenders[0].user_id.toString(), amount: borrower.amount }],
      group_id: curExpense?.group_id?.toString(),
      total_amount: curExpense.total_amount
    }, session);
  }

};


/**
 * 
 * @param {string} expense_id 
 * @param {session} session 
 * @returns expense
 */
export const findExpenseById = async (expense_id, session) => {

  let query = withSession( expense.findById(expense_id), session);

  const curExpense = await query;
  if(!curExpense) {
    logger.warn(`expense not found: ${expense_id}`);
    return;
  }

  return curExpense;
}


/**
 * sorted by recent first
 * @param {{start: Date, end: Date, userId: string}} param0 
 * @returns array of expense
 */
export const findPeriodicExpenses = async ({start, end, userId}) => {
  const expenses = await expense
    .find({
      $or: [
        { creator_id: userId },
        { "lenders.user_id": userId },
        { "borrowers.user_id": userId },
      ],
      created_at_date_time: { $gte: start, $lte: end },
    })
    .sort({ created_at_date_time: -1 });

  return expenses;
}


/**
 * if user is included in lender or borrower
 * @param {{userId: string, group_id: string}} param0 
 * @returns expense array
 */
export const findUserExpenses = async ({userId, group_id}) => {
  
  let filter = {
    $or: [
      { "lenders.user_id": userId.toString() },
      { "borrowers.user_id": userId.toString() },
    ],
  };

  if (group_id) {
    filter.group_id = group_id;
  }

  const expenses = await expense.find(filter).sort({
    created_at_date_time: -1,
  });

  return expenses;
}

/**
 * 
 * @param {{description: string, lender_id: string, borrower_id: string, group_id: string, wallet_id: string, min_amount: number, max_amount: number, category: string}} param0 
 * @returns array of expense
 */
export const findCustomExpenses = async ({
  description,
  lender_id,
  borrower_id,
  group_id,
  wallet_id,
  min_amount,
  max_amount,
  category}) => {

    let filter = {};

    if (description) {
      /**
       * Case-insensitive search
       */
      filter.description = { $regex: description, $options: "i" };
    }

    if (lender_id) {
      filter["lenders.user_id"] = lender_id;
    }

    if (borrower_id) {
      filter["borrowers.user_id"] = borrower_id;
    }

    if (group_id) {
      filter.group_id = group_id;
    }

    if (wallet_id) {
      filter.wallet_id = wallet_id;
    }

    if (category) {
      filter.expense_category = category;
    }

    if (min_amount || max_amount) {
      filter.total_amount = {};
      if (min_amount) filter.total_amount.$gte = Number(min_amount);
      if (max_amount) filter.total_amount.$lte = Number(max_amount);
    }

    const expenses = await expense
      .find(filter)
      .sort({ created_at_date_time: -1 });

    return expenses;
}