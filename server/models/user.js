import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone_number: {
      type: Number,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    profile_photo: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    oauth: [
      {
        auth_id: { type: String },
        auth_provider: { type: String },
      },
    ],
    lended: [
      {
        borrower_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number },
      },
    ],
    borrowed: [
      {
        lender_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number },
      },
    ],
    settled: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        amount: { type: Number, default: 0 },
      },
    ],
    futureFriends: [
      {
        email: { type: String, required: true }
      },
    ],
    otp: { type: String },
    otpExpiry: { type: Date },
    daily_limit: { type: Number },
    password: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

const user = mongoose.model("user", userSchema);
export default user;
