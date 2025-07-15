/** 
 * To clarify how error are handled in each file, each db operation fail,
 * business logic fail etc, should have an specific
 * message thrown to be able to log and know the error while
 * we should send a generic message to client not exposing
 * technical details and irrelevant info to client
 * 
 * by default exposeToClient is false
*/

/**
 * Params are not rechecked in every service
 * layer because eveything is mostly validated by zod,
 * hence service only throw intentional errors if operations
 * are failed.
 * 
 * But if services are called internally (through schedulers
 * or something else) then its necessary to implement one
 * level checks for safety while calling a particular service
 */

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
import admin from "firebase-admin";

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
import feedbackRouter from "./routes/feedback.js";
import { requestCounterMiddleware } from "./middlewares/requests.js";
import { scheduleCronJobs } from "./services/schedulerService.js";
import { initQueueWorkers } from "./queues/index.js";
import logger from "./logger/index.js";

const app = express();
const PORT = config.port || 3002;
const URI = config.mongoUri;


/**
 * firebase configuration at startup,
 * mainly for push notifications
 */
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


/**
 * @readonly cors do not applies to mobile apps,
 * keeping it for now for swagger, postman etc.
 */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json({ limit: "30mb", extended: true }));


app.listen(PORT, () => {
  logger.info(`Server is running on ${PORT}`);
});

mongoose
.connect(URI,{})
.then(() => logger.info(`Connected to Database`))
.catch((err) => logger.error(err));

/**
 * @todo schedule cron jobs,
 * later use cloud functions
 */
// scheduleCronJobs();

/**
 * @todo init the queue workers
 * here later for notifications
 * 
 * @todo this won't work if jobs becomes more
 * since cloud run will scale down to zero
 */
initQueueWorkers();

app.use(requestCounterMiddleware);

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
app.use("/api/v1/feedbacks", feedbackRouter);

app.use(errorMiddleware);

export default app;
