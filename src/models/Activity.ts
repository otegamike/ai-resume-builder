import mongoose, { Schema, Types } from "mongoose";
import type { ActivityType, ActivityEntityType } from "@/types/ActivityData";

export interface IActivity {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorEmail?: string;
  actorName?: string;
  type: ActivityType;
  title: string;
  detail?: string;
  entityType?: ActivityEntityType;
  entityId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema: Schema = new Schema<IActivity>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorEmail: { type: String, default: "" },
    actorName: { type: String, default: "" },
    type: {
      type: String,
      enum: [
        "resume_created",
        "resume_uploaded",
        "resume_imported",
        "resume_updated",
        "resume_deleted",
        "cover_letter_created",
        "cover_letter_generated",
        "job_created",
        "job_updated",
        "job_status_changed",
        "application_started",
        "application_submitted",
        "application_viewed_by_employer",
        "application_status_changed",
        "application_withdrawn",
        "organization_registered",
        "onboarding_completed",
        "user_signup",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    detail: { type: String, default: "" },
    entityType: {
      type: String,
      enum: ["resume", "coverLetter", "jobAd", "jobApplication", "company", "user", "system"],
      required: false,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: false, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivitySchema.index({ actorId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, createdAt: -1 });
ActivitySchema.index({ entityType: 1, entityId: 1 });

export default mongoose.models.Activity || mongoose.model<IActivity>("Activity", ActivitySchema);
