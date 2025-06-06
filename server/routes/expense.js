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
  deleteExpensePhoto
  removeExpenseWallet
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
router.post(
  "/new",
  isAuthenticated,
  upload.single("media"),          //handles optional file + fields
  validate(createExpenseSchema),   //Zod will receive fields correctly
  createExpense
);

//* GET APIs *//

router.get("/user/period", isAuthenticated,validate(getUserPeriodExpensesSchema), getUserPeriodExpenses);
router.get("/user", isAuthenticated,validate(getUserExpensesSchema), getUserExpenses);
router.get("/custom", isAuthenticated,validate(getCustomExpensesSchema), getCustomExpenses); // Uses query parameters for custom filtering
router.get("/:id", isAuthenticated,validate(getExpenseSchema), getExpenseById);

//* PUT APIs *//
router.put("/photo/:expense_id", isAuthenticated, upload.single("media"), deleteExpensePhoto);
router.put("/detach-wallet/:expense_id", isAuthenticated, removeExpenseWallet);
router.put("/:expense_id", isAuthenticated, upload.single("media"), validate(updateExpenseSchema), updateExpense);

//* DELETE APIs *//
router.delete("/:expense_id", isAuthenticated,validate(deleteExpenseSchema), deleteExpense);

export default router;