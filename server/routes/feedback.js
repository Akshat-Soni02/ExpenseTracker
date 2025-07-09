import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { registerFeedback } from "../controller/feedbackController.js";

const router = express.Router();

router.post(
  "/new",
  isAuthenticated,
  registerFeedback
);

export default router;