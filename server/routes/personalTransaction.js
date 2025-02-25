import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createPersonalTransaction, deletePersonalTransaction, updatePersonalTransaction,getPersonalTransactionById,getUserPeriodTypeTransactions } from "../controller/personalTransactionController.js";
const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createPersonalTransaction);

//* GET APIs *//
router.get("/userPeriod",isAuthenticated,getUserPeriodTypeTransactions)
router.get("/:personalTransaction_id", isAuthenticated, getPersonalTransactionById);

//* PUT APIs *//
router.put("/:personalTransaction_id", isAuthenticated, updatePersonalTransaction);

//* DELETE APIs *//
router.delete("/:personalTransaction_id", isAuthenticated, deletePersonalTransaction);

export default router;