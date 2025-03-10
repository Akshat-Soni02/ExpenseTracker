import bill from "../models/bill.js"

export const findBillById = async (id) => {
    const curBill = await bill.findById(id);
    if (!curBill) {
        throw new Error("Bill with this id doesn't exist");
    }
    return curBill;
};

export const handleBillRecurrence = async (id) => {
    try {
        const curBill = await findBillById(id); 
        if(!curBill) return new ErrorHandler("Error recurring bill", 400);
        curBill.recurring = false;
        if(curBill.status === "pending") {
            curBill.status = "missed"
        }
        const resetMembers = curBill.members.map((member) => ({
            ...member,
            status: "pending",
        }));

        const filterBill = {
            bill_title: curBill.bill_title,
            bill_number: curBill.bill_number + 1,
            amount: curBill.amount,
            bill_category: curBill.bill_category,
            due_date_time: curBill.due_date_time,
            recurring: true,
            status: "pending",
            creator_id: curBill.creator_id,
            members: resetMembers
        };
        await curBill.save();
        await bill.create(filterBill);
    } catch (error) {
        console.log("Error recurring bill", error);
    }
}

export const getRecurringBills = async () => {
    try {
        const bills = await bill.find({recurring: true}).select("_id due_date_time");
        return bills;
    } catch (error) {
        console.log("error fetching recurring bills");
    }
}

export const getUserBills = async ({ userId, status }) => {
    const query = {
        $or: [
            { "members.user_id": userId },
        ],
    };
    if (status) query["status"] = status;
    const curBills = await bill.find(query);
    if (!curBills) throw new Error("No Bills of the user exist");
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