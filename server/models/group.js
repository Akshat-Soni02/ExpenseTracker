import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  other_member_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  amount: { type: Number, required: true },
  exchange_status: {
    type: String,
    enum: ["lended", "borrowed", "settled"],
    required: true,
  },
},{timestamps: true});

const memberSchema = new mongoose.Schema({
  member_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  other_members: [transactionSchema],
},{timestamps: true});

const groupSchema = new mongoose.Schema({
  group_title: { type: String, required: true },
  initial_budget: { type: Number, default: 0 },
  settle_up_date: { type: Date },
  simplify_debts: {type: Boolean, default: false},
  members: [memberSchema],
  creator_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  
},{ timestamps: true });

groupSchema.index({ creator_id: 1, group_title: 1 }, { unique: true });

const group = mongoose.model("group", groupSchema);
group.syncIndexes();
export default group;
