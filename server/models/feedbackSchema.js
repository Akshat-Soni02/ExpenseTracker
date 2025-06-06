import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  message: { type: String },
}, { timestamps: true });

const feedback = mongoose.model("feedback", feedbackSchema);
export default feedback;
