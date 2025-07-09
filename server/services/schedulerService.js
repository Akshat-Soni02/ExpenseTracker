import cron from "node-cron";
import { getFilteredBills, sendBillRemindPushNotification } from "./billService.js";
import { BillStatus } from "../enums/billEnums.js";
import billRecurFail from "../models/billRecurFail.js";
import { addBillRecurJob } from "../queues/bill/processor.js";
import logger from "../logger/index.js";

/**
 * seperated this function to be able to use this
 * in cloud scheduler
 */
export const recurBillsAtMidnight = async () => {
    logger.info(`bill recur cron job started - every midnight job`);

    try {
        const N_DAYS_BACK = 3;
        const now = new Date();

        /**
         * explicitly setting to midnight,
         * (if for some reason this job gets delayed)
         */
        now.setHours(0, 0, 0, 0);

        /**
         * N days window's collection of bill
         * to not miss previously missed bills
         */
        const startOfWindow = new Date(now);
        startOfWindow.setDate(startOfWindow.getDate() - N_DAYS_BACK);

        const endOfWindow = new Date(now);
        /**
         * setting -1 gives 23:59:59:999
         * of previous day
         */
        endOfWindow.setMilliseconds(-1);

        const bills = await getFilteredBills({
            recurring: true,
            due_date_time: {
                $gte: startOfWindow,
                $lte: endOfWindow
            }, 
        });
            
        logger.debug(`Found ${bills.length} recurring bills`);

        for (const bill of bills) {
            try {
                if(bill.status === BillStatus.PENDING) {
                    bill.status = BillStatus.MISSED;
                    await bill.save();
                }

                await addBillRecurJob(bill._id);

            } catch (err) {
                logger.warn(`Error processing bill recurrance ${bill._id}:`, err);
                await billRecurFail.create({ bill_id: bill._id, error: err.message });
            }
        }

        /**
         * Reminding people about their due bill
         * for next day
         */
        const startOfTomorrow = new Date(now);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        startOfTomorrow.setHours(0, 0, 0, 0);

        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        const billToBeExpired = await getFilteredBills({
            due_date_time: {
                $gte: startOfTomorrow,
                $lte: endOfTomorrow
            }
        });

        for (const bill of billToBeExpired) {
            try {
                await sendBillRemindPushNotification({bill_id: bill._id});
            } catch (err) {
                logger.warn(`Error processing bill remind notification for ${bill._id}:`, err);
            }
        }

    } catch (err) {
        logger.error("Error during bill cron job execution:", err);
    }
}

/**
 * the scheduler picks all the bills whole
 */
export const billRecurScheduler = () => {
    logger.debug(`bill recur scheduler all set`);

    /**
     * runs every midnight
     */
    // cron.schedule("0 0 * * *", async () => {
    //     await recurBillsAtMidnight();
    // });

    logger.info(`bill cron ended`);
};


export const scheduleCronJobs = () => {
    // billRecurScheduler();
} 