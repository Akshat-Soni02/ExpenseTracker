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
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

//* POST APIs *//
router.post("/new", isAuthenticated, upload.single("media"), createExpense);

//* GET APIs *//

router.get("/user/period", isAuthenticated, getUserPeriodExpenses);
router.get("/user", isAuthenticated, getUserExpenses);
router.get("/custom", isAuthenticated, getCustomExpenses); // Uses query parameters for custom filtering
router.get("/:id", isAuthenticated, getExpenseById);

//* PUT APIs *//
router.put("/:expense_id", isAuthenticated, upload.single("media"), updateExpense);

//* DELETE APIs *//
router.delete("/:expense_id", isAuthenticated, deleteExpense);

export default router;