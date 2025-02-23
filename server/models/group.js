import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  exchange_status: {
    type: String,
    enum: ["lended", "borrowed"],
    required: true,
  },
});

const groupSchema = new mongoose.Schema({
  group_title: { type: String, required: true },
  members: {
    type: Map,
    of: new mongoose.Schema({
      transactions: {
        type: Map,
        of: transactionSchema,
      },
    }),
  },
  initial_budget: { type: Number, default: 0 },
  creator_id: { type: String, required: true },
  simplify_debts: { type: Boolean, default: false },
  settle_up_date: { type: Date },
});

groupSchema.index({ creator_id: 1, group_title: 1 }, { unique: true });

const group = mongoose.model("group", groupSchema);
export default group;
