/**
 * zod handles most of the type conversions,
 * specifically for amounts to convert to number from string
 */

import config from "./config/config.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { errorMiddleware } from "./middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import admin from "firebase-admin";
import path from "path";

import userRouter from "./routes/user.js";
import walletRouter from "./routes/wallet.js";
import groupRouter from "./routes/group.js";
import budgetRouter from "./routes/budget.js";
import settlementRouter from "./routes/settlement.js";
import expenseRouter from "./routes/expense.js";
import billRouter from "./routes/bill.js";
import personalTransactionRouter from "./routes/personalTransaction.js";
import testRouter from "./routes/test.js";
import detectedTransactionRouter from "./routes/detectedTransaction.js";
// import ocrRouter from "./routes/ocr.js";
// import chatbotRouter from "./routes/chatbot.js";
// import budgetPredictionRouter from "./routes/budgetPrediction.js";

import { scheduleCronJobs } from "./services/schedulerService.js";
import { sendEmail } from "./services/notificationService.js";
import { requestCounterMiddleware } from "./middlewares/requests.js";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = config.port || 3002;
const URI = config.mongoUri;
console.log(URI);

const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!firebaseKey) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var');
}

let parsedKey;
try {
  parsedKey = JSON.parse(Buffer.from(firebaseKey, 'base64').toString('utf-8'));
} catch (err) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
}

admin.initializeApp({
  credential: admin.credential.cert(parsedKey),
});

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(requestCounterMiddleware);


app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

mongoose
  .connect(URI,{})
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log(err));

// scheduleCronJobs();
// sendEmail();

app.use("/api/v1/users", userRouter);
app.use("/api/v1/wallets", walletRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/settlements", settlementRouter);
app.use("/api/v1/bills", billRouter);
app.use("/api/v1/budgets",budgetRouter);
app.use("/api/v1/personal-transactions",personalTransactionRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/test", testRouter);
app.use("/api/v1/detected-transactions", detectedTransactionRouter);
// app.use("/api/v1/ocrs", ocrRouter);
// app.use("/api/v1/budget-prediction", budgetPredictionRouter);
// app.use("/api/v1/chatbot",chatbotRouter);
app.use(errorMiddleware);
export default app;
