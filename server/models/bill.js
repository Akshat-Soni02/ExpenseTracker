import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    bill_number: {type: Number, required: true},
    bill_title: { type: String, required: true },
    amount: { type: Number, required: true },
    bill_category: { type: String },
    due_date_time: { type: Date, required: true },
    final_pay_date: { type: Date },
    recurring: { type: Boolean },
    status: { type: String },
    creator_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    members: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number, required: true },
        wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "wallet" },
        status: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

billSchema.index({ creator_id: 1, bill_title: 1, bill_number: 1 }, { unique: true });

const bill = mongoose.model("bill", billSchema);
bill.syncIndexes();
export default bill;
