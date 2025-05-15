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
import { validate } from "../middlewares/validateRequest.js";
import { 
  createExpenseSchema, 
  updateExpenseSchema,
  deleteExpenseSchema,
  getExpenseSchema,
  getUserPeriodExpensesSchema,
  getUserExpensesSchema,
  getCustomExpensesSchema,

} from "../validators/expense.schema.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

//* POST APIs *//
router.post("/new", isAuthenticated, validate(createExpenseSchema),upload.single("media"), createExpense);

//* GET APIs *//

router.get("/user/period",validate(getUserPeriodExpensesSchema), isAuthenticated, getUserPeriodExpenses);
router.get("/user",validate(getUserExpensesSchema), isAuthenticated, getUserExpenses);
router.get("/custom",validate(getCustomExpensesSchema), isAuthenticated, getCustomExpenses); // Uses query parameters for custom filtering
router.get("/:id",validate(getExpenseSchema), isAuthenticated, getExpenseById);

//* PUT APIs *//
router.put("/:expense_id",validate(updateExpenseSchema), isAuthenticated, upload.single("media"), updateExpense);

//* DELETE APIs *//
router.delete("/:expense_id",validate(deleteExpenseSchema), isAuthenticated, deleteExpense);

export default router;