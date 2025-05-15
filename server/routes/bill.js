import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { 
    createBill, 
    deleteBill, 
    getBillById, 
    updateBill, 
    handleBillUserStatusUpdate 
} from "../controller/billController.js";
import {validate} from "../middlewares/validateRequest.js";
import {
    createBillSchema,
    handleBillUserStatusUpdateSchema,
    updateBillSchema,
    deleteBillParamsSchema,
    getBillByIdParamsSchema
} from "../validators/bill.schema.js";
const router = express.Router();

//* POST APIs *//
router.post("/new",validate(createBillSchema),isAuthenticated, createBill);
router.post("/bill-status-update/:billId",validate(handleBillUserStatusUpdateSchema), isAuthenticated, handleBillUserStatusUpdate);

//* GET APIs *//
router.get("/:id",validate(getBillByIdParamsSchema), isAuthenticated, getBillById);

//* PUT APIs *//
router.put("/:id",validate(updateBillSchema), isAuthenticated, updateBill);

//* DELETE APIs *//
router.delete("/:id",validate(deleteBillParamsSchema), isAuthenticated, deleteBill);

export default router;
