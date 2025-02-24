import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createBill, deleteBill, getBillById, updateBill, handleBillStatusUpdate } from "../controller/billController.js";


const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createBill);
router.post("/bill-status-update/:billId", isAuthenticated, handleBillStatusUpdate);

//* GET APIs *//
router.get("/:id", isAuthenticated, getBillById);

//* PUT APIs *//
router.put("/:id", isAuthenticated, updateBill);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteBill);

export default router;
