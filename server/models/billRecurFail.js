import mongoose from "mongoose";

const billRecurFailSchema = new mongoose.Schema(
  {
    bill_id: {type: String, required: true},
    error: {type: String},
  },
  { timestamps: true }
);

const billRecurFail = mongoose.model("billRecurFail", billRecurFailSchema);
export default billRecurFail;
