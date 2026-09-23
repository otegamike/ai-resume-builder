export type ActivityType =
  | "resume_created"
  | "resume_uploaded"
  | "resume_imported"
  | "resume_updated"
  | "resume_deleted"
  | "cover_letter_created"
  | "cover_letter_generated"
  | "job_created"
  | "job_updated"
  | "job_status_changed"
  | "application_started"
  | "application_submitted"
  | "application_viewed_by_employer"
  | "application_status_changed"
  | "application_withdrawn"
  | "organization_registered"
  | "onboarding_completed"
  | "user_signup";

export type ActivityEntityType =
  | "resume"
  | "coverLetter"
  | "jobAd"
  | "jobApplication"
  | "company"
  | "user"
  | "system";

export interface Activity {
  _id: string;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  type: ActivityType;
  title: string;
  detail?: string;
  entityType?: ActivityEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
