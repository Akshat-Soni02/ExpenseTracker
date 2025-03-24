import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    settlement_description: { type: String, required: true },
    payer_wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "wallet" },
    payer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    receiver_wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "wallet" },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    amount: { type: Number, required: true },
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: "group" },
  },
  { timestamps: true }
);

const settlement = mongoose.model("settlement", settlementSchema);
export default settlement;
