import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  amount: { type: Number, required: true, default: 0 },
  wallet_title: { type: String, required: true },
  photo: {
    url: { type: String },
    public_id: { type: String },
  },
  lower_limit: { type: Number },
  creator_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  members: [
    {
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    },
  ],
});

const wallet = mongoose.model("wallet", walletSchema);
export default wallet;
