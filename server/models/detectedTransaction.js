import mongoose from "mongoose";

const detectedTransactionSchema = new mongoose.Schema(
  {
    transaction_type: { type: String, required: true },
    description: { type: String, required: true },
    from_account: { type: String },
    to_account: { type: String },
    amount: { type: Number, required: true },
    created_at_date_time: { type: Date, default: Date.now },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    notes: { type: String },
  },
  { Timestamp: true }
);

const detectedTransaction = mongoose.model(
  "detectedTransaction",
  detectedTransactionSchema
);
export default detectedTransaction;
