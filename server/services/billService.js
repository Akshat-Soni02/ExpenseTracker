import bill from "../models/bill.js"
import { BillStatus ,BillMemberStatus} from "../enums/billEnums.js";
import { sendNotificationService } from "./notificationService.js";
import { findUserById } from "./userService.js";
import ErrorHandler from "../middlewares/error.js";

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


export const handleBillRemind = async (id) => {
    try {
        console.log(`Sending bill remind of ${id}`);

        const currBill = await findBillById(id);
        if(!currBill) throw new Error("Error finding bill");

        const formattedDueDate = new Date(currBill.due_date_time).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        const members = currBill.members;

        for (const member of members) {
            try {
                if (member.status.toString() === BillMemberStatus.PENDING) {

                    const user = await findUserById(member.user_id);
                    if (!user) throw new Error("Error finding user");

                    const tokens = user.accessTokens;
                    if(!tokens || tokens.length === 0) continue;
                    const body = `You have a pending amount of ₹${member.amount} for "${currBill.bill_title}", Due by ${formattedDueDate}.`;

                    for (const token of tokens) {
                        await sendNotificationService({
                            token: token,
                            title: "Bill Due Soon",
                            body: body,
                        });
                    }
                    
                }
            } catch (error) {
                throw error;
            }
        }

    } catch (err) {
        console.log("Error sending bill reminders", err);
        throw new ErrorHandler("Error sending bill reminders", 500);
    }
}

export const sendNewBillNotifications = async (id,userId) => {

    try{
        console.log("Sending new bill notifications");

        const currBill = await findBillById(id);
        if(!currBill) {
            console.log(`Error processing notification for new bill: ${id}`);
        }

        const members = currBill.members;
        
        for (const member of members) {

            if (member.user_id.toString() !== userId.toString()) {
                const user = await findUserById(member.user_id);
                if (!user) {
                    console.log(`User not found to send new bill notification`);
                    continue;
                }

                const tokens = user.accessTokens;
                if(!tokens || tokens.length === 0) continue;

                const body = `You’ve been added to ${currBill.bill_title}.`;
                for (const token of tokens) {
                    await sendNotificationService({
                        token: token,
                        title: "🧾 New Bill",
                        body: body,
                    });
                }
            }

        }
    }
    catch(err){
        console.log("Error sending new bill notifications", err);
        throw new ErrorHandler("Error sending new bill notifications", 500);
    }
}