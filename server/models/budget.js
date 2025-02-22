import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    budget_title: { type: String, required: true },
    amount: { type: Number, required: true },
    budget_category: { type: String },
    period: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { Timestamp: true }
);

const budget = mongoose.model("budget", budgetSchema);
export default budget;
