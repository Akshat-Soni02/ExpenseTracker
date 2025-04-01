import bill from "../models/bill.js"
import { BillStatus ,BillMemberStatus} from "../enums/billEnums.js";

export const findBillById = async (id) => {
    console.log("Finding bill by id");
    const curBill = await bill.findById(id);
    if (!curBill) {
        throw new Error("Bill with this id doesn't exist");
    }
    console.log("Bill found");
    return curBill;
};

export const handleBillRecurrence = async (id) => {
    try {
        console.log("Handling Bill Recurrence");
        const curBill = await findBillById(id); 
        if(!curBill) return new ErrorHandler("Error recurring bill", 400);
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
        console.log("Bill Recurrence handled");
    } catch (error) {
        console.log("Error recurring bill", error);
    }
}

export const getRecurringBills = async () => {
    try {
        console.log("Fetching recurring bills");
        const bills = await bill.find({recurring: true}).select("_id due_date_time");
        console.log("Recurring bills fetched");
        if (!bills) {
            console.log("No recurring bills exist");
        }
        return bills;
    } catch (error) {
        console.log("error fetching recurring bills");
    }
}

export const getUserBills = async ({ userId, status }) => {
    console.log("Fetching user bills");
    const query = {
        $or: [
            { "members.user_id": userId },
        ],
    };
    if (status) query["status"] = status;
    const curBills = await bill.find(query);
    if (!curBills) throw new Error("No Bills of the user exist");
    console.log("User bills fetched");
    return curBills;
};


export const handleBillRemind = async () => {
    try {
        
    } catch (error) {
        
    }
}

export const sendBillJoinInvite = async ({id,}) => {
    try {
        
    } catch (error) {
        
    }
}