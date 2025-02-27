import ErrorHandler from "../middlewares/error.js";
import bill from "../models/bill.js"

// when a bill is created and shared with other members we have to let them know
// in contrast with previous approach the members array does already contian user himself
export const createBill = async (req, res, next) => {
    try {
        const id = req.user._id;
        const {bill_title, amount, bill_category, due_date_time, recurring, members} = req.body;
        
        // iterate to members array (exclude the user) and send push notification to others about the bill

        const newBill = await bill.create({
            bill_title,
            bill_number: 1,
            amount,
            bill_category,
            due_date_time,
            recurring,
            members, 
            status: "pending",
            creator_id:id
        });

        res.status(201).json({
            success: true,
            bill: newBill
        });
    } catch (error) {   
        if (error.code === 11000) {
            // Duplicate key error (E11000)
            return res.status(400).json({
                error:
                "A bill with this title already exists. Please choose a different name.",
            });
        }
        console.log("Error creating bill", error);
        next(error);
    }
}

export const handleBillUserStatusUpdate = async (req, res, next) => {
    try {
        const id = req.user._id.toString();
        const { status } = req.body;
        const { billId } = req.params;

        const curBill = await bill.findById(billId).select("members status due_date_time");

        if (!curBill) {
            return res.status(404).json({ success: false, message: "Bill not found to update the user status" });
        }

        let memberFound = false;
        curBill.members = curBill.members.map((member) => {
            if (member.user_id.toString() === id) {
                memberFound = true;
                return { ...member, status };
            }
            return member;
        });

        if (!memberFound) {
            return res.status(403).json({ success: false, message: "User not a member of this bill to update the status" });
        }

        const areAllStatusPaid = curBill.members.every(member => member.status === "paid");

        const now = new Date();
        if (!areAllStatusPaid) {
            curBill.status = curBill.due_date_time < now ? "missed" : "pending";
        } else {
            curBill.status = "paid";
        }

        await curBill.save();

        res.status(200).json({
            success: true,
            bill: curBill
        });
    } catch (error) {
        console.error("Error updating bill status:", error);
        next(error);
    }
};



export const updateBill = async (req, res, next) => {
    try {
        // only these fields are updated
        // "bill_title": "rent",
        // "bill_category" : "rent",
        // "due_date_time" : "24-2-2025",
        // "recurring" : true
        // members
        // amount
        const {id} = req.params;
        const updatedDetails = req.body;
        const updatedBill = await bill.findByIdAndUpdate(id, updatedDetails, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            bill: updatedBill
        });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error (E11000)
            return res.status(400).json({
                error:
                "A bill with this title already exists. Please choose a different name.",
            });
        }
        console.log("Error updating bill", error);
        next(error);
    }
}

export const deleteBill = async (req, res, next) => {
    try {
        const {id} = req.params;
        await bill.findByIdAndDelete(id);
        res.status(200).json({
            success: true
        });
    } catch (error) {
        console.log("Error deleting bill", error);
        next(error);
    }
}

export const getBillById = async (req, res, next) => {
    try {
        const {id} = req.params;
        const curBill = await bill.findById(id);
        res.status(200).json({
            success: true,
            bill: curBill
        });
    } catch (error) {
        console.log("Error fetching bill by id", error);
        next(error);
    }
}