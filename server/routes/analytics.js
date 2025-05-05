import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { getMonthlySpending, getCategoricalSpending } from "../controller/analyticsController.js";
const router = express.Router();

router.get("/monthly-spending", isAuthenticated, getMonthlySpending);
router.get("/categorical-spending", isAuthenticated, getCategoricalSpending);

export default router;