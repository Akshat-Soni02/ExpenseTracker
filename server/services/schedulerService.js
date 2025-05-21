import cron from "node-cron";
import { handleBillRecurrence, getRecurringBills, handleBillRemind } from "./billService.js";
import bill from "../models/bill.js";
import { BillStatus } from "../enums/billEnums.js";
import billRecurFail from "../models/billRecurFail.js";

//This cron based update is delayed and consumes extra compute, instead we can utilize redis based queing
//When we create or update a bill, we enqueue a job with a delay until its due_date_time.
export const billRecurScheduler = () => {
    console.log("scheduler started");

    cron.schedule("0 0 * * *", async () => {
        console.log("cron job started for every midnight");

        try {
            //Handling those bills whoose due date has been passed
            const now = new Date();

            const startOfYesterday = new Date(now);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);
            startOfYesterday.setHours(0, 0, 0, 0);

            const endOfYesterday = new Date(startOfYesterday);
            endOfYesterday.setHours(23, 59, 59, 999);

            const bills = await bill.find({
                due_date_time: {
                    $gte: startOfYesterday,
                    $lte: endOfYesterday
                }
            });
              
            console.log(`Found ${bills.length} recurring bills`);

            for (const bill of bills) {
                try {
                    if(bill.status === BillStatus.PENDING) {
                        bill.status = BillStatus.MISSED;
                        await bill.save();
                    }

                    if(bill.recurring) {
                        await handleBillRecurrence(bill._id);
                    }
                } catch (err) {
                    console.error(`Error processing bill ${bill._id}:`, err);
                    await billRecurFail.create({ bill_id: bill._id, error: err.message });
                }
            }

            //Handling remind for upcoming bills [due on next day]
            const startOfTomorrow = new Date(now);
            startOfYesterday.setDate(startOfYesterday.getDate() + 1);
            startOfYesterday.setHours(0, 0, 0, 0);

            const endOfTomorrow = new Date(startOfYesterday);
            endOfYesterday.setHours(23, 59, 59, 999);

            const billToBeExpired = await bill.find({
                due_date_time: {
                    $gte: startOfTomorrow,
                    $lte: endOfTomorrow
                }
            });

            for (const bill of billToBeExpired) {
                try {
                    await handleBillRemind(bill._id);
                } catch (err) {
                    console.error(`Error processing bill ${bill._id}:`, err);
                }
            }

        } catch (err) {
            console.error("Error during cron job execution:", err);
        }
    });

    console.log("bill scheduler ended");
};


export const scheduleCronJobs = () => {
    billRecurScheduler();
} 