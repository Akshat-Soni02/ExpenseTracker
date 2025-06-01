import wallet from "../models/wallet.js";
import { ERROR_TYPES, STATUS_CODES } from "../config/constants.js";
import logger from "../logger/index.js";
import ErrorHandler from "../middlewares/error.js";
import { withSession } from "../utils/transaction.js";

/**
 * 
 * @param {object} data contains new wallet data along with creator's id
 * @returns new wallet
 * @throws if operation fails
 */
export const createWalletService = async (data) => {
  const newWallet = await wallet.create(data);

  if(!newWallet) throw new ErrorHandler(`db operation failed to create wallet`, STATUS_CODES.SERVER_ERROR);

  logger.info(`wallet ${newWallet._id} created by user ${data.creator_id}`);
  return newWallet;
}


/**
 * 
 * @param {{wallet_id: string, data: object}} param0 object with wallet's id and new data
 * @returns updated wallet
 * @throws if operation fails
 */
export const updateWalletService = async ({wallet_id, data}) => {
  const updatedWallet = await wallet.findByIdAndUpdate(wallet_id, data, {
    new: true,
    runValidators: true
  });

  if(!updatedWallet) throw new ErrorHandler(`Wallet not found to update data: ${wallet_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });

  logger.info(`Wallet ${wallet_id} 's details updated`);
  return updatedWallet;
}


/**
 * Soft delete
 * 
 * @param {{wallet_id: string, user_id: string}} param0 user's id and wallet's id
 * @returns deletedWallet
 */
export const deleteWalletService = async ({wallet_id, user_id}) => {
  /**
   * not actually deleting wallet, just soft deleting it
   */
  const deletedWallet = await wallet.findByIdAndUpdate(wallet_id, { deleted: true });

  if(!deletedWallet) throw new ErrorHandler(`Wallet not found to delete: ${wallet_id}`, STATUS_CODES.NOT_FOUND, { errorType: ERROR_TYPES.NOT_FOUND });

  logger.info(`Wallet ${wallet_id} deleted by user ${user_id}`);
  return deletedWallet;
}


/**
 * 
 * @param {string} wallet_id 
 * @returns wallet if found else null
 */
export const findWalletById = async (wallet_id, session) => {

  let query = withSession(wallet.findById(wallet_id), session)

  const curWallet = await query;

  if (!curWallet) {
      logger.warn(`Wallet not found: ${wallet_id}`);
      return null;
  }
  
  return curWallet;
};

/**
 * Transfer amount from one wallet to another,
 * accepts +ve amount, runs few checks before update
 * @param {{toWallet: string, fromWallet: string, amount: number}} param0 
 * @returns nothing if success/both wallets are same
 * @throws if wallet has insufficient balance or operation fails
 */
export const transferWalletAmounts = async({toWallet, fromWallet, amount}, session) => {

  if(!toWallet || !fromWallet || !amount) {
    logger.info(`Details missing to transfer ${amount} from wallet ${fromWallet} to ${toWallet}`);
    throw new ErrorHandler(`Unable to transfer amount, details insuffecient`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION});
  }

  if(toWallet.toString() === fromWallet.toString()) return;

  const debitWallet = await findWalletById(fromWallet, session);
  if (!debitWallet) throw new ErrorHandler(`Wallet not found: ${fromWallet}, terminating transfer operation...`);

  const creditWallet = await findWalletById(toWallet, session);
  if (!creditWallet) throw new ErrorHandler(`Wallet not found: ${toWallet}, terminating transfer operation...`);

  if (amount > debitWallet.amount) throw new ErrorHandler(`Wallet ${debitWallet.wallet_title} doesn't have enough balance`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});
  if (creditWallet.deleted || debitWallet.deleted) throw new ErrorHandler(`Deleted Wallets ${toWallet} or ${fromWallet} accessed`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION});

  let debitQuery = withSession(wallet.findByIdAndUpdate(
    fromWallet,
    { amount: debitWallet.amount - amount },
    { runValidators: true, new: true }
  ), session);

  const updatedDebitWallet = await debitQuery;

  if(!updatedDebitWallet) throw new ErrorHandler(`db operation failed to updated wallet`);

  let creditQuery = withSession(wallet.findByIdAndUpdate(
    toWallet,
    { amount: creditWallet.amount + amount },
    { runValidators: true, new: true }
  ), session);

  if(session) creditQuery = creditQuery.session(session);
  
  const updatedCreditWallet = await creditQuery;

  if(!updatedCreditWallet) throw new ErrorHandler(`db operation failed to updated wallet`);
  logger.info(`Transfered ${amount} from ${fromWallet} to ${toWallet}`);
}


/**
 * takes amount with -ve or +ve sign, modifies balances
 * @param {{id: string, amount: number, zeroTrue: boolean}} param0
 */
export const modifyWalletBalance = async ({id, amount, zeroTrue}, session) => {

  let query = withSession(wallet.findById(id).select("wallet_title amount"), session);

  const curWallet = await query;
  if(!curWallet) throw new ErrorHandler(`Walled not found: ${id}, terminating modify function...`);

  if (curWallet.amount + amount < 0) {
    if(zeroTrue) amount = -curWallet.amount;
    else throw new ErrorHandler(`wallet ${curWallet.wallet_title} doesn't have enough balance`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION, exposeToClient: true});
  }

  if(curWallet.deleted) throw new ErrorHandler(`Deleted wallet ${id} accessed`, STATUS_CODES.BAD_REQUEST, {errorType: ERROR_TYPES.INVALID_OPERATION});

  let updateQuery = withSession(wallet.findByIdAndUpdate(id, {amount: curWallet.amount + amount}, {new: true, runValidators: true}), session);

  const updatedWallet = await updateQuery;
  if(!updatedWallet) throw new ErrorHandler(`Unable to update wallet ${id}, validation fail/db operation fail`);

  logger.info(`Modified Wallet ${id} Balance`);
};


/**
 * @param {string} user_id
 * @returns wallet
 */
export const findUserWallets = async (user_id, session) => {
  let query = withSession(wallet.find({ creator_id: user_id, deleted: false }), session);
  const wallets = await query;
  return wallets;
};

/**
 * checks if wallet has sufficient balance,
 * takes positive amount only
 * @param {{id: string, amount: number}} param0 
 * @returns boolean
 * @throws if find op fails
 */
export const sufficientBalance = async ({id, amount}, session) => {
  let query = withSession(wallet.findById(id).select("amount"), session);

  const curWallet = await query;
  if(!curWallet) throw new ErrorHandler(`Wallet not found: ${id}, cannot check balance`);

  if (curWallet.amount - amount >= 0) return true;
  return false;
}
