import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { createPersonalTransaction } from "../controller/personalTransactionController.js";
const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createPersonalTransaction);

//* GET APIs *//
// router.get("/:id", isAuthenticated, getBudgetById);

//* PUT APIs *//
// router.put("/:id", isAuthenticated, updateBudget);

//* DELETE APIs *//
// router.delete("/:id", isAuthenticated, deleteBudget);

export default router;