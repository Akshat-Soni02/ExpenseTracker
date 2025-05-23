import bill from "../models/bill.js"
import { BillStatus ,BillMemberStatus} from "../enums/billEnums.js";
import { findUserById } from "./userService.js";
import ErrorHandler from "../middlewares/error.js";
import logger from "../logger/index.js";
import { STATUS_CODES } from "../config/constants.js";
import { addPushJob } from "../queues/push/processor.js";

/**
 * @description if errors occurs in the bill service file,
 * it could be due to naming conflicts between model and 
 * local "bill" variable
 */


/**
 * the service calls db to create a new bill
 * with manually nunbering the bill as 1 also
 * sends notification to others about the new bill
 * @param {object} data new bill data
 * @returns newly created bill
 */
export const createBillService = async (data) => {
    const newBill = await bill.create({...data, bill_number: 1, status: BillStatus.PENDING});

    /**
     * Although we are not sending this message to client but
     * still passing message here to see in error log
     */
    if(!newBill) return next(new ErrorHandler(`mongo operation failed to create bill`, STATUS_CODES.SERVER_ERROR));

    try {
        await sendNewBillPushNotifications({bill: newBill, creator_id: data.creator_id.toString()});
    } catch (error) {
        logger.warn(err);
    }

    logger.info(`bill ${newBill._id} created by user ${data.creator_id}`);
    return newBill;
}


/**
 * Update the current user's status in a bill
 * 
 * @param {Object} options
 * @param {string} options.user_id - Current user ID
 * @param {string} options.bill_id - Bill ID
 * @param {string} options.status - New status
 * @returns Updated bill
 * @throws ErrorHandler if invalid
 */
export const updateUserBillStatus = async ({ user_id, bill_id, status }) => {
    const curBill = await bill.findById(bill_id).select("members status due_date_time bill_title");

    if (!curBill) {
        logger.warn(`Bill not found when updating user status: ${bill_id}`);
        throw new ErrorHandler("Bill not found", STATUS_CODES.NOT_FOUND, { errorType: "NotFound" });
    }

    let memberFound = false;
    curBill.members = curBill.members.map((member) => {
        if (member.user_id.toString() === user_id) {
            memberFound = true;
            return { ...member, status };
        }
        return member;
    });

    if (!memberFound) {
        logger.warn(`User ${user_id} attempted to update status in a bill they are not a member of: ${bill_id}`)
        throw new ErrorHandler("You are not a member of this bill", STATUS_CODES.FORBIDDEN, { exposeToClient: true, errorType: "UnauthorizedAction" });
    }

    const areAllPaid = curBill.members.every(m => m.status === BillMemberStatus.PAID);
    const now = new Date();

    curBill.status = areAllPaid
        ? BillStatus.PAID
        : (curBill.due_date_time < now ? BillStatus.MISSED : BillStatus.PENDING);

    await curBill.save();

    try {
        if(areAllPaid) await sendBillPaidPushNotification({bill: curBill, active_user_id: user_id.toString()});
        else if(status === BillMemberStatus.PAID) await sendMarkAsPaidPushNotifications({bill: curBill, active_user_id: user_id.toString()});
        logger.info(`Notifications sent for bill ${bill_id}`);
    } catch (error) {
        logger.warn(err);
    }

    logger.debug(`User ${user_id} updated status to ${status} for bill ${bill_id}. New bill status: ${curBill.status}`);
    return curBill;
};


export const findBillById = async (id) => {
    console.log("Finding bill by id");
    
    if(!id) {
        console.log(`undefined id to get bill ${id}`);
        throw new Error(`Bill with this id doesn't exist ${id}`);
    }

    const curBill = await bill.findById(id);
    if (!curBill) {
        console.log(`Bill with this id doesn't exist ${id}`);
        return null;
    }
    return curBill;
};

export const handleBillRecurrence = async (id) => {

    try {
        console.log(`Recurring bill ${id}`);

        const curBill = await findBillById(id);
        if(!curBill) {
            console.log(`Bill with this id doesn't exist ${id}`);
            throw new Error(`Bill with this id doesn't exist ${id}`);
        }

        curBill.recurring = false;
        if(curBill.status === BillStatus.PENDING) {
            curBill.status = BillStatus.MISSED;
        }

        const resetMembers = curBill.members.map((member) => ({
            ...member,
            status: BillMemberStatus.PENDING,
        }));

        const filterBill = {
            bill_title: curBill.bill_title,
            bill_number: curBill.bill_number + 1,
            amount: curBill.amount,
            bill_category: curBill.bill_category,
            due_date_time: curBill.due_date_time,
            recurring: true,
            status: BillStatus.PENDING,
            creator_id: curBill.creator_id,
            members: resetMembers
        };

        await curBill.save();
        await bill.create(filterBill);

        console.log(`Recured bill with ${id}`);
    } catch (error) {
        console.log("Error recurring bill", error);
        const errorMessage = error?.message || String(error);
        throw new Error(`Error recurring bill with id : ${id}, ${errorMessage}`);
    }
}

export const getRecurringBills = async () => {
    try {
        console.log("Fetching recurring bills");
        const bills = await bill.find({ recurring: true }).select("_id due_date_time");
        return bills;
    } catch (error) {
        console.error("Error fetching recurring bills:", error?.message || String(error));
        throw error;
    }
};


export const getUserBills = async ({ userId, status }) => {
    try {
        console.log("Fetching user bills");
        if(!userId) {
            console.log(`Not valid userId: ${userId} to fetch user bills`);
            return [];
        }

        const query = {
            $or: [
                { "members.user_id": userId },
            ],
        };

        if (status) query["status"] = status;

        const curBills = await bill.find(query);
        console.log("User bills fetched");
        return curBills;
    } catch (error) {
        console.log(`Error fetching user bills`,error);
        throw error;
    }
};


/**
 * @function allBillMemberPushNotificationService is a dummy
 * structure service to send push notification to all bill
 * members except the active user who made the action
 * 
 * @param {{bill: object, active_user_id: string, notification_body: string, notification_title: string, ignorePaidMember: boolean}} param0
 * @returns nothing if success, else throws error
 */
export const allBillMemberPushNotificationService = async ({bill, active_user_id, notification_body, notification_title, ignorePaidMember}) => {

    try{
        const members = bill.members || [];
        
        for (const member of members) {
            if(active_user_id && member.user_id.toString() === active_user_id.toString()) {
                logger.debug(`Skipping active user notification ${active_user_id}`);
                continue;
            }
            if(ignorePaidMember && member.status === BillStatus.PAID) continue;

            try {
                const user = await findUserById(member.user_id);
                if (!user) {
                    logger.warn(`User not found: ${member.user_id}`);
                    continue;
                }

                const tokens = user.accessTokens || [];
                if(tokens.length === 0) continue;

                for (const token of tokens) {

                    try {
                        await addPushJob({token, title: notification_title, body: notification_body});
                    } catch (tokenErr) {
                        logger.error(`Failed to ${notification_title} bill push notification`, {
                            userId: member.user_id,
                            token,
                            error: tokenErr.message,
                        });
                    }

                }
            } catch (userErr) {
                logger.error("Error processing bill member for notification", {
                    userId: member.user_id,
                    error: userErr.message,
                });
                continue;
            }

        }
    }
    catch(err){
        logger.error("Error in processing bill notification", {
            bill_id,
            creator_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending bill notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}

/**
 * Sends push notifications for a newly created bill
 * 
 * @param {{bill: object, creator_id: string}} param0 Object containing new bill and bill creator id
 * @returns nothing if success, else throws error
 */
export const sendNewBillPushNotifications = async ({bill, creator_id}) => {

    try{
        const body = `You've been added to ${bill.bill_title}.`;
        const title = "🧾 New Bill";
        await allBillMemberPushNotificationService({bill, active_user_id: creator_id, notification_body: body, notification_title: title});
    }
    catch(err){
        logger.error("Error in sendNewBillPushNotifications", {
            creator_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending new bill notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}


/**
 * Sends push notification for showing a user paid bill
 * 
 * @param {{bill: object, active_user_id: string}} param0
 * @returns nothing if success else throws error
 */
export const sendMarkAsPaidPushNotifications = async({bill, active_user_id}) => {
    try{
        const active_user = await findUserById(active_user_id);
        if(!active_user) {
            logger.warn(`user not found ${active_user_id}, terminating push notification for mark as paid`);
            return;
        }

        const body = `${active_user.name} paid their share for ${bill.bill_title}.`;
        const title = "🧾 Bill Contribution";
        await allBillMemberPushNotificationService({bill, active_user_id: active_user_id.toString(), notification_body: body, notification_title: title});
    }
    catch(err){
        logger.error("Error in sendMarkAsPaidPushNotification", {
            active_user_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending mark as paid bill notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}

/**
 * Sends push notification for showing a bill is missed
 * 
 * @param {{bill_id: string}} param0
 * @returns nothing if success else throws error
 */
export const sendMissedBillPushNotificaton = async({bill_id}) => {
    try{
        const bill = await findBillById(bill_id);
        if(!bill) {
            logger.warn(`Bill not found ${bill_id}, terminating push notification for missed bill`);
            return;
        }

        let pendingCount = 0;
        bill.members.forEach((member) => {if(member.status === BillMemberStatus.PENDING) pendingCount++});

        const body = `${bill.bill_title}'s due date is passed, ${pendingCount} people haven't paid the bill yet.`;
        const title = "🧾 Bill Overdue";
        await allBillMemberPushNotificationService({bill, notification_body: body, notification_title: title});
    }
    catch(err){
        logger.error("Error in sendMissedBillPushNotification", {
            bill_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending missed bill notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}

/**
 * Sends push notification for indicating bill has been paid
 * 
 * @param {{bill: object, active_user_id: string}} param0
 * @returns nothing if success else throws error
 */
export const sendBillPaidPushNotification = async({bill, active_user_id}) => {
    try{
        const active_user = await findUserById(active_user_id);
        if(!active_user) {
            logger.warn(`user not found ${active_user_id}, terminating push notification for bill paid`);
            return;
        }

        const body = `All dues are cleared for ${bill.bill_title}.`;
        const title = "🧾 Bill Paid";
        await allBillMemberPushNotificationService({bill, notification_body: body, notification_title: title});
    }
    catch(err){
        logger.error("Error in sendBillPaidPushNotification", {
            active_user_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending bill paid notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}

/**
 * Sends push notification for reminding about pending bill
 * 
 * @todo for now the if any errors
 * occurs in this function, there are
 * no retries hence bill remainders will
 * be missed - implement them
 * @param {{bill_id: string}} param0 
 * @returns nothing if success, else throws error
 */
export const sendBillRemindPushNotification = async ({bill_id}) => {
    try {
        const bill = await findBillById(bill_id);
        if(!bill) {
            logger.warn(`bill not found ${bill_id}, terminating push notification for bill remind`);
            return;
        }

        const formattedDueDate = new Date(bill.due_date_time).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const body = `Hey, ${bill.bill_title} is approaching its deadline, Due by ${formattedDueDate}.`;
        const title = "🧾 Bill Remainder";
        await allBillMemberPushNotificationService({bill, active_user_id, notification_body: body, notification_title: title, ignorePaidMember});

    } catch (err) {
        logger.error("Error in sendBillRemindPushNotification", {
            bill_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending bill remind notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}

/**
 * Sends push notification for showing a user deleted bill
 * 
 * @param {{bill: object, active_user_id: string}} param0
 * @returns nothing if success else throws error
 */
export const sendBillDeletedPushNotification = async({bill, active_user_id}) => {
    try{
        const active_user = await findUserById(active_user_id);
        if(!active_user) {
            logger.warn(`user not found ${active_user_id}, terminating push notification for bill delete`);
            return;
        }

        const body = `${bill.bill_title} has been deleted by ${active_user.name}.`;
        const title = "🧾 Bill Deleted";
        await allBillMemberPushNotificationService({bill, active_user_id, notification_body: body, notification_title: title});
    }
    catch(err){
        logger.error("Error in sendBillDeletedPushNotification", {
            active_user_id,
            error: err.message,
        });
        throw new ErrorHandler("Error sending bill deleted notifications", STATUS_CODES.SERVER_ERROR, {errorType: "notificationError"});
    }
}