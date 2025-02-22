import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
  {
    settlement_description: { type: String, required: true },
    media: {
      url: { type: String },
      public_id: { type: String },
    },
    wallet_id: { type: mongoose.Schema.Types.ObjectId, ref: "wallet" },
    payer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    amount: { type: Number, required: true },
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: "group" },
  },
  { Timestamp: true }
);

const settlement = mongoose.model("settlement", settlementSchema);
export default settlement;
