import cron from "node-cron";
import { handleBillRecurrence, getRecurringBills } from "./billService.js";

export const billRecurScheduler = () => {
    console.log("scheduler started");
    cron.schedule("* * * * *", async () => {
        console.log("cron job started");
        const bills  = await getRecurringBills();
        console.log(bills);
        bills.forEach( async (bill) => {
            const billDateTime = bill.due_date_time;
            const now = new Date();

            // Remove seconds & milliseconds from both
            billDateTime.setSeconds(0, 0);
            now.setSeconds(0, 0);

            if (billDateTime.getTime() === now.getTime()) {
                await handleBillRecurrence(bill._id);
            }
        })
    });
    console.log("scheduler ended");
}

export const scheduleCronJobs = () => {
    billRecurScheduler();
} 