import mongoose from "mongoose";

const walletSchema = new mongoose.Schema({
  amount: { type: Number, required: true, default: 0 },
  wallet_title: { type: String, required: true },
  lower_limit: { type: Number },
  creator_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  // members: [
  //   {
  //     user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  //   },
  // ],
  deleted: {type: Boolean, default: false}
}, { timestamps: true });

walletSchema.index({ creator_id: 1, wallet_title: 1 }, { unique: true });

const wallet = mongoose.model("wallet", walletSchema);
wallet.syncIndexes();
export default wallet;
