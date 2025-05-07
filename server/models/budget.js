import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    budget_title: { type: String, required: true },
    amount: { type: Number, required: true },
    current_spend: { type: Number, default: 0 },
    budget_category: { type: String },
    period: { type: String },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

budgetSchema.index({ user_id: 1, budget_category: 1 }, { unique: true });

const budget = mongoose.model("budget", budgetSchema);
export default budget;
