import mongoose, { Schema, Types } from "mongoose";
import type { NotificationType } from "@/types/NotificationData";

export interface INotification {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  activityId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    activityId: { type: Schema.Types.ObjectId, ref: "Activity", required: true, index: true },
    type: {
      type: String,
      enum: [
        "application_submitted",
        "application_status_changed",
        "application_viewed_by_employer",
        "application_withdrawn",
        "job_status_changed",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
