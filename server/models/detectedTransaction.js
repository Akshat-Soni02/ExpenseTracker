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
  { timestamps: true }
);

const detectedTransaction = mongoose.model(
  "detectedTransaction",
  detectedTransactionSchema
);
export default detectedTransaction;

// Sent Rs.40.00 from Kotak Bank AC X4444 to q241747299@ybl on 26-02-25.UPI Ref 502231073137. Not you, https://kotak.com/KBANKT/Fraud
// Received Rs.67.00 in your Kotak Bank AC X7015 from kaushalprajapatite@okhdfcbank on 27-02-25.UPI Ref:100664172215.