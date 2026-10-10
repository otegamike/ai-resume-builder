import type {
  EmailOutboxStatus,
  EmailOutboxType,
  EmailPriority,
} from "@/models/EmailOutbox";
import type { SuppressionReason } from "@/models/EmailSuppression";

export type { EmailOutboxStatus, EmailOutboxType, EmailPriority };
export type { SuppressionReason };

export interface EmailAdminRow {
  _id: string;
  type: EmailOutboxType;
  to: string;
  subject: string | null;
  status: EmailOutboxStatus;
  priority: EmailPriority;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  sendAfter: string;
  lockedAt: string | null;
  resendId: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  relatedActivityId: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  waitingForRetry: boolean;
  stuckSending: boolean;
}

export interface EmailStatsResponse {
  total: number;
  byStatus: Record<EmailOutboxStatus, number>;
  byType: Record<string, number>;
  waitingForRetry: number;
  stuckSending: number;
  failedLast24h: number;
  sentLast24h: number;
  quota: {
    dayKey: string;
    dayCount: number;
    dailyLimit: number;
    dayPercent: number;
    monthKey: string;
    monthCount: number;
    monthlyLimit: number;
    monthPercent: number;
  };
  suppressionsCount: number;
}

export interface SuppressionRow {
  _id: string;
  email: string;
  reason: SuppressionReason;
  createdAt: string;
  updatedAt: string;
}

export interface EmailWebhookEventRow {
  _id: string;
  resendId: string | null;
  type: string;
  at: string;
}
