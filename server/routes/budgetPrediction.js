import  express from 'express';
import { isAuthenticated } from "../middlewares/auth.js";
import {predictBudgetHandler} from '../controller/budgetPredictionController.js';
const router = express.Router();

router.post('/predict', isAuthenticated,predictBudgetHandler);

export default router;
