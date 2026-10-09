import mongoose, { Schema, Types } from "mongoose";

export type EmailOutboxType =
  | "welcome"
  | "application-submitted"
  | "application-received"
  | "application-reminder"
  | "job-alert";

export type EmailPriority = 0 | 1 | 2;

export type EmailOutboxStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "skipped"
  | "cancelled";

export interface IEmailOutbox {
  _id: Types.ObjectId;
  type: EmailOutboxType;
  userId?: Types.ObjectId;
  to: string;
  subject?: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  priority: EmailPriority;
  status: EmailOutboxStatus;
  attempts: number;
  lastError?: string;
  sendAfter: Date;
  lockedAt?: Date | null;
  resendId?: string;
  relatedActivityId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date | null;
}

const EmailOutboxSchema: Schema = new Schema<IEmailOutbox>(
  {
    type: {
      type: String,
      enum: ["welcome", "application-submitted", "application-received", "application-reminder", "job-alert"],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    to: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: false },
    payload: { type: Schema.Types.Mixed, default: {} },
    dedupeKey: { type: String, required: true, unique: true, index: true },
    priority: { type: Number, enum: [0, 1, 2], default: 0, index: true },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "failed", "skipped", "cancelled"],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
    sendAfter: { type: Date, default: () => new Date(), index: true },
    lockedAt: { type: Date, default: null },
    resendId: { type: String, required: false, index: true },
    relatedActivityId: { type: Schema.Types.ObjectId, ref: "Activity", required: false },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmailOutboxSchema.index({ status: 1, sendAfter: 1, priority: 1 });
EmailOutboxSchema.index({ userId: 1, type: 1 });

export default mongoose.models.EmailOutbox ||
  mongoose.model<IEmailOutbox>("EmailOutbox", EmailOutboxSchema);
