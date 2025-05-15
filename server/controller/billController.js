import ErrorHandler from "../middlewares/error.js";
import bill from "../models/bill.js"
import { BillStatus ,BillMemberStatus} from "../enums/billEnums.js";
import { sendNewBillNotifications } from "../services/billService.js";

// when a bill is created and shared with other members we have to let them know
// in contrast with previous approach the members array does already contian user himself
export const createBill = async (req, res, next) => {
    try {
        console.log("Creating Bill");
        const id = req.user._id;
        const {bill_title, bill_category, due_date_time, recurring, members} = req.body;        
        const amount  = Number(req.body.amount);
        // iterate to members array (exclude the user) and send push notification to others about the bill
        const newBill = await bill.create({
            bill_title,
            bill_number: 1,
            amount,
            bill_category,
            due_date_time,
            recurring,
            members, 
            status: BillStatus.PENDING,
            creator_id:id
        });
        console.log("Bill Created");
        if(!newBill) return next(new ErrorHandler("Error creating new bill",404));
        await sendNewBillNotifications(newBill._id.toString(),id);

        res.status(201).json({
            message: "Successfully created new bill",
            // data: newBill
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
        console.log("Updating Bill Status");
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

        const areAllStatusPaid = curBill.members.every(member => member.status === BillMemberStatus.PAID);

        const now = new Date();
        if (!areAllStatusPaid) {
            curBill.status = curBill.due_date_time < now ? BillStatus.MISSED : BillStatus.PENDING;
        } else {
            curBill.status = BillStatus.PAID;
        }

        await curBill.save();
        console.log("Bill status updates");
        res.status(200).json({
            message: "User state updated in bill",
            data: curBill
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
        console.log("Updating Bill");
        const {id} = req.params;
        let updatedDetails = req.body;
        if(updatedDetails.amount) updatedDetails.amount = Number(updatedDetails.amount);
        const updatedBill = await bill.findByIdAndUpdate(id, updatedDetails, {
            new: true,
            runValidators: true
        });
        if(!updatedBill) return next(new ErrorHandler("Error updating bill", 400));
        console.log("Bill updating successfully");
        res.status(200).json({
            message: "Successfully updated bill",
            data: updatedBill
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
        console.log("Deleting Bill");
        const {id} = req.params;
        await bill.findByIdAndDelete(id);
        console.log("Bill deleted successfully");
        res.status(200).json({
            message: "Successfully deleted bill"
        });
    } catch (error) {
        console.log("Error deleting bill", error);
        next(error);
    }
}

export const getBillById = async (req, res, next) => {
    try {
        console.log("Getting Bill by ID");
        const {id} = req.params;
        const curBill = await bill.findById(id);
        if(!curBill) return next(new ErrorHandler("Bill not found",404));

        console.log("Bill fetched successfully");
        res.status(200).json({
            message: "bill fetched successfully",
            data: curBill
        });
    } catch (error) {
        console.log("Error fetching bill by id", error);
        next(error);
    }
}