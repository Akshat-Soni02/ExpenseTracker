import { MESSAGES, STATUS_CODES } from "../config/constants.js";
import ErrorHandler from "../middlewares/error.js";
import { findCustomExpenses } from "../services/expenseService.js";
import { findPersonalTransactionByQuery } from "../services/personalTransactionService.js";
import { createWalletService, deleteWalletService, findWalletById, transferWalletAmounts, updateWalletService } from "../services/walletService.js";
import { withTransaction } from "../utils/transaction.js"


/**
 * 
 * creates new wallet
 * @returns response with wallet
 */
export const createWallet = async (req, res, next) => {
  try {
    const user_id = req.user._id;
    const newWallet = await createWalletService({...req.body, creator_id: user_id});

    res.status(STATUS_CODES.CREATED).json({
      message: MESSAGES.RESOURCE_CREATED("Wallet"),
      data: newWallet,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 
 * everything is editable here
 * @returns response with updated wallet
 */
export const updateWallet = async (req, res, next) => {
  try {
    const updatedWallet = await updateWalletService({wallet_id: req.params.id, data: req.body});
    
    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.RESOURCE_UPDATED("Wallet"),
      data: updatedWallet,
    });
  
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * Soft delete wallet method
 * @returns reponse with no data
 */
export const deleteWallet = async (req, res, next) => {
  try {
    const { id } = req.params;

    /**
     * although the service give updated (softly deleted) wallet,
     * we don't need it for now
     */
    await deleteWalletService({wallet_id: id, user_id: req.user.id});
  
    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.DELETED,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * fetches wallet details
 * @returns response with wallet
 */
export const getWalletById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const curWallet = await findWalletById(id);
    
    if(!curWallet) throw new ErrorHandler(`Client get operation failed on wallet: ${id}`, STATUS_CODES.SERVER_ERROR);

    res.status(STATUS_CODES.OK).json({
      message: MESSAGES.FETCHED("Wallet"),
      data: curWallet,
    });
  } catch (error) {
    next(error);
  }
};


/**
 * Transfer amount from one wallet to another,
 * fails on transfer amount being larger then wallet's present amount
 * @returns response with no data
 */
export const walletsAmountTransfer = async (req, res, next) => {
  try {
    const { fromWallet, toWallet } = req.query;
    const { amount } = req.body;

    await withTransaction(async (session) => {
      return await transferWalletAmounts({toWallet, fromWallet, amount}, session);
    });
    
    res.status(STATUS_CODES.OK).json({
      message: "Successfully transfered",
    });
  } catch (error) {
    next(error);
  }
};


/**
 * 
 * Collects all transactions (personal + expenses)
 * happened with a wallet
 * @returns data contains expenses and personal keys
 */
export const walletTransactions = async (req, res, next) => {
  try {
    const { wallet_id } = req.params;
    const id = req.user._id;

    const expensesWithWallet = await findCustomExpenses({wallet_id, lender_id: id});

    const personalsWithWallet = await findPersonalTransactionByQuery({wallet_id, user_id: id});

    res.status(STATUS_CODES.OK).json({
      message: "Retreived wallet transactions",
      data: {
        expenses: expensesWithWallet,
        personals: personalsWithWallet
      },
    });
  } catch (error) {
    next(error);
  }
}