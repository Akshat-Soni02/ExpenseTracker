import mongoose from "mongoose";

const personalTransactionSchema = new mongoose.Schema(
  {
    transaction_type: { type: String, required: true },
    description: { type: String, required: true },
    wallet_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wallet",
    },
    media: {
      url: { type: String },
      public_id: { type: String },
    },
    transaction_category: { type: String },
    created_at_date_time: { type: Date, default: Date.now },
    notes: { type: String },
    amount: {type: Number,required: true },
    budget_id: { type: mongoose.Schema.Types.ObjectId, ref: "budget"},
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  },
  { timestamps: true }
);

const personalTransaction = mongoose.model(
  "personalTransaction",
  personalTransactionSchema
);
export default personalTransaction;
