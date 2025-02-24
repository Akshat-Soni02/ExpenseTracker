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
import settlementRouter from "./routes/settlement.js";
import expenseRouter from "./routes/expense.js";

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
  .connect(URI)
  .then(() => console.log("Connected to Database"))
  .catch((err) => console.log(err));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/wallets", walletRouter);
app.use("/api/v1/groups", groupRouter);
app.use("/api/v1/settlements", settlementRouter);
app.use("/api/v1/expenses", expenseRouter);
