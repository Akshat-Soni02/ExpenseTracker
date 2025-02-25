import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { 
    createBudget,
    updateBudget ,
    deleteBudget,
    getBudgetById
} from "../controller/budgetController.js";
const router = express.Router();

//* POST APIs *//
router.post("/new", isAuthenticated, createBudget);

//* GET APIs *//
router.get("/:id", isAuthenticated, getBudgetById);

//* PUT APIs *//
router.put("/:id", isAuthenticated, updateBudget);

//* DELETE APIs *//
router.delete("/:id", isAuthenticated, deleteBudget);

export default router;