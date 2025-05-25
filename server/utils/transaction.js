import mongoose from "mongoose";

/**
 * Runs the given handler inside a MongoDB transaction.
 * Automatically handles commit/abort and session cleanup.
 * 
 * NOTE - No long async operations between DB calls
 * because if that operation takes too long mongo might
 * Timeout the transaction or Reject commit due to network delay
 *
 * @param {(session: mongoose.ClientSession) => Promise<any>} handler
 * @returns {Promise<any>}
 */
export async function withTransaction(handler) {
    /**
     * session is not thread safe, hence using a session
     * concurrently for multiple requests breaks the code,
     * while same session should be passed down to function
     * which requires rollbacks (affects each other)
     */
    const session = await mongoose.startSession();

    /**
     * specific to mongodb, it provides only one
     * transaction to start at a time for a 
     * particular session, hence we need to 
     * complete that transaction before starting a 
     * new one
     */
    session.startTransaction();

    try {
        /**
         * handler is a callback function,
         * extra props passed by the caller will go
         * to handler
         */
        const result = await handler(session);

        /**
         * success operation, commits this transaction in session
         * but if next handler fails the catch block will abort
         * whole session so no changes will be made
         */
        await session.commitTransaction();
        return result;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }

}

/**
 * Wrap a Mongoose query with an optional session.
 * 
 * @param {mongoose.Query} query - The Mongoose query.
 * @param {mongoose.ClientSession} [session] - Optional session.
 * @returns {mongoose.Query}
 */
export const withSession = (query, session) => {
    return session ? query.session(session) : query;
};
  
  