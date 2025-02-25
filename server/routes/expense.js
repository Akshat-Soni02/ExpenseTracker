import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseById,
  getUserPeriodExpenses,
  getUserExpenses,
  getCustomExpenses,
} from "../controller/expenseController.js";

const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createExpense);

//* GET APIs *//

router.get("/user/period", isAuthenticated, getUserPeriodExpenses);
router.get("/user", isAuthenticated, getUserExpenses);
router.get("/custom", isAuthenticated, getCustomExpenses); // Uses query parameters for custom filtering
router.get("/:id", isAuthenticated, getExpenseById);

//* PUT APIs *//
router.put("/:id", isAuthenticated, updateExpense);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteExpense);

export default router;