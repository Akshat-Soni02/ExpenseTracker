import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    bill_title: { type: String, required: true },
    amount: { type: Number, required: true },
    bill_category: { type: String },
    due_date: { type: Date, required: true },
    final_pay_date: { type: Date },
    recurring: { type: Boolean },
    status: { type: String },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    members: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number },
        wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "wallet" },
        status: { type: String },
      },
    ],
  },
  { Timestamp: true }
);

const bill = mongoose.model("bill", billSchema);
export default bill;
