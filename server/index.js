import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";

import userRouter from "./routes/user.js";
import walletRouter from "./routes/wallet.js";
import groupRouter from "./routes/group.js";
import budgetRouter from "./routes/budget.js";
import settlementRouter from "./routes/settlement.js";
import expenseRouter from "./routes/expense.js";
import billRouter from "./routes/bill.js";
import personalTransactionRouter from "./routes/personalTransaction.js";
import testRouter from "./routes/test.js";
import { scheduleCronJobs } from "./services/schedulerService.js";
import { sendEmail } from "./services/notificationService.js";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3002;
const URI = process.env.MONGO_URI;

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

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});

mongoose
  .connect(URI,{tlsAllowInvalidCertificates: true})
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
app.use("/api/v1/personalTransactions",personalTransactionRouter);
app.use("/api/v1/expenses", expenseRouter);
app.use("/api/v1/test", testRouter);
