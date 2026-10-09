import mongoose, { Schema, Types } from "mongoose";

export interface IEmailEvent {
  _id: Types.ObjectId;
  resendId?: string;
  type: string;
  at: Date;
  raw: Record<string, unknown>;
}

const EmailEventSchema: Schema = new Schema<IEmailEvent>(
  {
    resendId: { type: String, required: false, index: true },
    type: { type: String, required: true, index: true },
    at: { type: Date, default: () => new Date() },
    raw: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

// Webhook receipts are operational noise; keep 45 days.
EmailEventSchema.index({ at: 1 }, { expireAfterSeconds: 45 * 24 * 60 * 60 });

export default mongoose.models.EmailEvent ||
  mongoose.model<IEmailEvent>("EmailEvent", EmailEventSchema);
