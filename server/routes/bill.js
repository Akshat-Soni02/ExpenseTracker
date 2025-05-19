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
router.post("/new",isAuthenticated,validate(createBillSchema), createBill);
router.post("/bill-status-update/:billId", isAuthenticated,validate(handleBillUserStatusUpdateSchema), handleBillUserStatusUpdate);

//* GET APIs *//
router.get("/:id", isAuthenticated,validate(getBillByIdParamsSchema), getBillById);

//* PUT APIs *//
router.put("/:id", isAuthenticated,validate(updateBillSchema), updateBill);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated,validate(deleteBillParamsSchema), deleteBill);

export default router;
