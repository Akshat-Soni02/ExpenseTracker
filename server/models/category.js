import mongoose from "mongoose";

/**
 * user = null equals global category
 * also
 * type: { type: String, enum: ['expense', 'bill', 'wallet', ...] },
 * later adding type field will allow per type categories
 */
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    name_slug: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    is_deleted: { type: Boolean }
  },
  { timestamps: true }
);

categorySchema.index(
  { user_id: 1, name_slug: 1 },
  {
    unique: true,
    partialFilterExpression: { is_deleted: false }
  }
);

const category = mongoose.model("category", categorySchema);
export default category;
