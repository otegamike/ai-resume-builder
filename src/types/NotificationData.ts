export type NotificationType =
  | "application_submitted"
  | "application_status_changed"
  | "application_viewed_by_employer"
  | "application_withdrawn"
  | "job_status_changed";

export interface Notification {
  _id: string;
  recipientId: string;
  activityId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
