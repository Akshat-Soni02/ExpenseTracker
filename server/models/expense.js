import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    lenders: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number },
      },
    ],
    borrowers: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number },
      },
    ],
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: "group" },
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wallet",
      required: true,
    },
    media: {
      url: { type: String },
      public_id: { type: String },
    },
    total_amount: { type: Number, required: true },
    expense_category: { type: String },
    created_at_date_time: { type: Date, default: Date.now },
    creator: [
      {
        creator_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: {type: Number},    
      },
    ],
    notes: { type: String },
  },
  { Timestamp: true }
);

const expense = mongoose.model("expense", expenseSchema);
export default expense;
