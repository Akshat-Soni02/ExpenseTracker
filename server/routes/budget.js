import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { 
    createBudget,
    updateBudget ,
    deleteBudget,
    getBudgetById
} from "../controller/budgetController.js";
import { predictBudgetHandler } from "../controller/budgetPredictionController.js";
import {validate} from "../middlewares/validateRequest.js";
import {
    createBudgetSchema,
    updateBudgetSchema,
    deleteBudgetSchema,
    getBudgetSchema
} from "../validators/budget.schema.js";
const router = express.Router();

//* POST APIs *//
router.post("/new", validate(createBudgetSchema),isAuthenticated, createBudget);
router.post('/predict', isAuthenticated,predictBudgetHandler);

//* GET APIs *//
router.get("/:id",validate(getBudgetSchema), isAuthenticated, getBudgetById);

//* PUT APIs *//
router.put("/:id",validate(updateBudgetSchema), isAuthenticated, updateBudget);

//* DELETE APIs *//
router.delete("/:id",validate(deleteBudgetSchema), isAuthenticated, deleteBudget);

export default router;