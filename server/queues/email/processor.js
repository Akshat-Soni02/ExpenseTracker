import { emailQueue } from "./queue.js";

/**
 * 
 * @param {{ inviter: {name: string}, invitee: {email: email} }} data
 * @function addInviteMailJob Enqueue invite and inviter data to queue
 * for invite to application, used for friend
 * invite
 * 
 * @todo to be removed in future with message
 */
export const addInviteMailJob = async (data) => {
    await emailQueue.add("send-invite-email", data);
};

/**
 * 
 * @param {{toMail: email, subject: string, text: string}} data
 * @function addPassResetMailJob Enqueue otp mail for password reset 
 */
export const addPassResetMailJob = async (data) => {
    await emailQueue.add("send-pass-reset-email", data);
}

/**
 * 
 * @param {{lender: {name: string}, borrowerProfile: object,amount: number | string, group: object}} data 
 * @function addBorrowMailJob Enqueue remainder mail for borrower
 */
export const addBorrowMailJob = async (data) => {
    await emailQueue.add("send-borrow-email", data);
}