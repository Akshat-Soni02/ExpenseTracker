import personalTransaction from "../models/personalTransaction.js";
import { modifyWalletBalance } from "./walletService.js";
import logger from "../logger/index.js";
import { uploadMedia ,deleteMedia} from "./cloudinaryService.js";
import { v4 as uuidv4 } from 'uuid';
import { withSession } from "../utils/transaction.js";
import ErrorHandler from "../middlewares/error.js";


/**
 * @todo Budget service has been 
 * removed from all the function, they 
 * required re-architecturing to configure again
 * 
 * if referce is needed from previous code, take 
 * a look at some older branches on git
 */


/**
 * 
 * @param {{file: string, data: object}} param0 
 * @param {session} session 
 * @returns newly created personal transaction
 */
export const createPersonalService = async ({file, data}, session) => {

    let media = null;

    if(file) {
        const today = new Date().toISOString().split('T')[0];

        const mediaPath = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        const publicId = `personalTransaction/${uuidv4()}/${today}`;

        const result = await uploadMedia(mediaPath, "personalTransactionMedia", publicId);

        media = {
            url: result.secure_url,
            public_id: result.public_id,
        };
    }

    const { transaction_type, wallet_id, amount } = data;

    if(wallet_id) {
        await modifyWalletBalance({id: wallet_id, amount: transaction_type === "expense" ? -1*amount : amount}, session);
    }

    const doc = await personalTransaction.create([{...data, media}], {session});
    const newPersonal = doc[0];
    if (!newPersonal) throw new ErrorHandler(`create operation failed for personal transaction`);

    logger.info(`personal transaction ${newPersonal._id} created by user ${data.user_id}`);
    return newPersonal;
}

/**
 * 
 * @todo right now its not checking if the wallets have 
 * sufficient balance or not, we are relying on post 
 * changes check (while reverting or making changes) 
 * which increases number of steps
 * 
 * @param {{personalTransaction_id: string, data: object}} param0 
 * @param {session} session 
 * @returns updated transaction
 */
export const updatePersonalService = async ({personalTransaction_id, data}, session) => {

    const updatedDetails = data;

    const existingPersonalTransaction = await findPersonalTransactionById(personalTransaction_id, session);

    if (!existingPersonalTransaction) throw new ErrorHandler(`personal transaction not found: ${personalTransaction_id}, terminating update...`);

    /**
    * cases with wallet - 
    * c-1 earlier there was a wallet and now wallet is removed
    * c-2 earlier there was no wallet and now wallet is added
    * c-3 earlier there was a wallet and now wallet is updated
    * c-4 no wallet update (1. there is a wallet earlier, 2. there is no wallet earlier)
    */

    const newType = updatedDetails.transaction_type ? updatedDetails.transaction_type : existingPersonalTransaction.transaction_type;
    const newAmount = updatedDetails.amount ? updatedDetails.amount : existingPersonalTransaction.amount;

    /**
     * c-2, c-3
     */
    if(updatedDetails.wallet_id) {
        await modifyWalletBalance({id: updatedDetails.wallet_id, amount: newType === "expense" ? -1*newAmount : newAmount}, session);

        /**
         * c-4 (there is a wallet earlier)
         */
    } else if(existingPersonalTransaction.wallet_id) {
        await modifyWalletBalance({id: existingPersonalTransaction.wallet_id, amount: newType === "expense" ? -1*newAmount : newAmount}, session);
    }

    await revertPersonalTransaction({ personalTransaction: existingPersonalTransaction }, session);
    
    let updateQuery = withSession(personalTransaction.findByIdAndUpdate(personalTransaction_id, updatedDetails, {
        new: true,
        runValidators: true,
    }), session);

    const updatedPersonalTransaction = await updateQuery;
    if(!updatedPersonalTransaction) throw new ErrorHandler(`personal transaction ${personalTransaction_id} failed to update`);

    return updatedPersonalTransaction;
}



/**
 * 
 * @param {string} personalTransaction_id 
 * @param {session} session 
 */
export const deletePersonalService = async ( personalTransaction_id, session ) => {

    const personalTransaction = await findPersonalTransactionById(personalTransaction_id, session);
    if(!personalTransaction) throw new ErrorHandler(`personal transactio not found: ${personalTransaction_id}, not deleting it...`);

    await revertPersonalTransaction({ personalTransaction }, session);
    
    const deletedPersonalTransaction = await personalTransaction.deleteOne({session});
    if(!deletedPersonalTransaction) throw new ErrorHandler(`delete operation failed for transaction ${personalTransaction_id}`);

    logger.info(`personal transaction ${personalTransaction_id} deleted`);
}



/**
 * 
 * although right now there i only wallet 
 * to revert but its for seperate concerns
 * 
 * @param {{personalTransaction: object, zeroTrue: boolean}} personalTransaction 
 * @param {session} session 
 */
export const revertPersonalTransaction = async ({ personalTransaction, zeroTrue}, session ) => {

    if(personalTransaction.wallet_id) {
        await modifyWalletBalance({
            id: personalTransaction.wallet_id,
            amount: personalTransaction.transaction_type === "expense" ? personalTransaction.amount : -1*personalTransaction.amount,
            zeroTrue
        }, session);
    }

}

/**
 * remove personal transaction's wallet
 * 
 * @param {string} personalTransaction_id 
 */
export const detachTransactionWallet = async (personalTransaction_id) => {
    const personalTransaction = await findPersonalTransactionById(personalTransaction_id);
    if(!personalTransaction) {
        throw new ErrorHandler(`Personal Transaction not found ${personalTransaction_id}, can't remove wallet`);
    }

    if(personalTransaction.wallet_id) {
        await modifyWalletBalance({ id: personalTransaction.wallet_id, amount: personalTransaction.transaction_type === "expense" ? personalTransaction.amount : -1*personalTransaction.amount, zeroTrue: true});
        personalTransaction.wallet_id = null;
    }

    await personalTransaction.save();
}

/**
 * 
 * @param {string} personal_id 
 * @param {session} session 
 * @returns personal transaction if found
 */
export const findPersonalTransactionById = async (personal_id, session) => {

    let query = withSession( personalTransaction.findById(personal_id), session);
    const currPersonalTransaction = await query;
    if(!currPersonalTransaction) {
        logger.error(`personal transaction ${personal_id} not found`);
        return;
    }

    return currPersonalTransaction;
};


/**
 * 
 * @param {{start_date: date, end_date: date, transaction_type: string}} param0 
 * @returns array of transactions
 */
export const fetchPeriodTransactions = async ({start_date, end_date, transaction_type, user_id}) => {

    const query = {
        user_id: new mongoose.Types.ObjectId(user_id),
        created_at_date_time: {
            $gte: new Date(start_date),
            $lte: new Date(end_date)
        }
    };

    if (transaction_type) {
        query.transaction_type = transaction_type;
    }

    const transactions = await findPersonalTransactionByQuery(query);
    
    logger.info(`fetched ${transaction_type} transactions for ${start_date} to ${end_date}`);
    return transactions;
}


/**
 * 
 * @param {string} user_id 
 * @returns array of user's transactions
 */
export const findUserPersonalTransactions = async (user_id) => {
    const transactions = await personalTransaction.find({user_id}).sort({created_at_date_time: -1});
    return transactions;
}



/**
 * 
 * @param {object} query 
 * @returns array of personal transaction
 */
export const findPersonalTransactionByQuery = async (query) => {

    if(!query) throw new ErrorHandler(`undefined query to get personal transactions`);

    const currPersonalTransaction = await personalTransaction.find(query);
    return currPersonalTransaction;
};

/**
 * 
 * @param {string} personalTransaction_id 
 * @returns void
 */
export const deletePersonalTransactionMedia = async (personalTransaction_id) => {
  const personalTransactionObj = await findPersonalTransactionById(personalTransaction_id);
  if (!personalTransactionObj) throw new ErrorHandler(`Personal Transaction not found: ${expense_id}, cannot delete media`);

  if (!personalTransactionObj.media || !personalTransactionObj.media.public_id) {
    logger.warn(`No media found for personal transaction ${personalTransaction_id}`);
    return;
  }

  try {
    await deleteMedia(personalTransactionObj.media.public_id);
    personalTransactionObj.media = null;
    await personalTransactionObj.save();
    logger.debug(`Media deleted for personal transaction ${personalTransaction_id}`);
  } catch (error) {
     throw error;
  }
}
