import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { validate } from "../middlewares/validateRequest.js";
import { createBillSchema, billUserStatusUpdateSchema, getBillByIdSchema,updateBillSchema, deleteBillSchema } from "../validators/bill.schema.js";
import { createBill, deleteBill, getBillById, updateBill, handleBillUserStatusUpdate } from "../controller/billController.js";


const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, validate(createBillSchema), createBill);
router.post("/bill-status-update/:billId", isAuthenticated,validate(billUserStatusUpdateSchema), handleBillUserStatusUpdate);

//* GET APIs *//
router.get("/:id", isAuthenticated,validate(getBillByIdSchema), getBillById);

//* PUT APIs *//
router.put("/:id", isAuthenticated,validate(updateBillSchema), updateBill);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated,validate(deleteBillSchema), deleteBill);

export default router;
