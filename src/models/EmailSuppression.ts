import mongoose, { Schema, Types } from "mongoose";

export type SuppressionReason = "bounce" | "complaint" | "manual";

export interface IEmailSuppression {
  _id: Types.ObjectId;
  email: string;
  reason: SuppressionReason;
  createdAt: Date;
  updatedAt: Date;
}

const EmailSuppressionSchema: Schema = new Schema<IEmailSuppression>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    reason: { type: String, enum: ["bounce", "complaint", "manual"], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.EmailSuppression ||
  mongoose.model<IEmailSuppression>("EmailSuppression", EmailSuppressionSchema);
