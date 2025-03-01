import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  updateTransactions,distributeAmounts,revertExpenseEffect,updateFriendlyExchangeStatesOnLendings,findBudgetByCategorys
} from "../controller/testController.js";

const router = express.Router();

//* POST APIs *//
router.post("/", isAuthenticated, updateTransactions);
router.post("/distribute", isAuthenticated, distributeAmounts);
router.post("/revert", isAuthenticated, revertExpenseEffect);
router.post("/friendly", isAuthenticated, updateFriendlyExchangeStatesOnLendings);
router.post("/budget", isAuthenticated, findBudgetByCategorys);
export default router;