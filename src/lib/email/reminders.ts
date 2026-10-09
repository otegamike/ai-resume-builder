import "server-only";

import dbConnect from "@/lib/db";
import DraftJobApplication from "@/models/DraftJobApplication";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";
import User from "@/models/User";
import EmailOutbox from "@/models/EmailOutbox";
import { getEmailConfig } from "./config";
import { dedupeKeys, enqueue } from "./dispatcher";
import { appUrl } from "./site";

void DraftJobApplication;
void JobApplication;
void JobAd;
void User;
void EmailOutbox;

/**
 * Hours after the last draft edit before a reminder becomes due.
 * Shipped behind EMAIL_FLAG_APPLICATION_REMINDER=false; the owner decides.
 */
export const REMINDER_DELAY_HOURS = 24;

export interface ReminderScanResult {
  scanned: number;
  enqueued: number;
  skippedSubmitted: number;
  skippedAlreadySent: number;
  disabled?: boolean;
}

/**
 * One reminder per unfinished draft application, max one ever per draft.
 * Submitted applications are excluded (the apply route deletes the draft on
 * submit; this re-checks so a race can never remind after submission).
 * Cancelled implicitly: no draft row, no reminder.
 */
export async function enqueueApplicationReminders(now: Date = new Date()): Promise<ReminderScanResult> {
  const result: ReminderScanResult = { scanned: 0, enqueued: 0, skippedSubmitted: 0, skippedAlreadySent: 0 };
  if (!getEmailConfig().flagApplicationReminder) {
    return { ...result, disabled: true };
  }
  await dbConnect();
  const dueBefore = new Date(now.getTime() - REMINDER_DELAY_HOURS * 3_600_000);
  const drafts = await DraftJobApplication.find({ updatedAt: { $lte: dueBefore } })
    .limit(100)
    .lean();
  result.scanned = drafts.length;

  for (const draft of drafts) {
    const submitted = await JobApplication.findOne({
      jobId: draft.jobId,
      applicantId: draft.applicantId,
    })
      .select("_id")
      .lean();
    if (submitted) {
      result.skippedSubmitted += 1;
      continue;
    }
    const dedupeKey = dedupeKeys.applicationReminder(String(draft._id));
    const already = await EmailOutbox.findOne({ dedupeKey }).select("_id").lean();
    if (already) {
      result.skippedAlreadySent += 1;
      continue;
    }
    const [applicant, job] = await Promise.all([
      User.findById(draft.applicantId).select("email name").lean(),
      JobAd.findById(draft.jobId).select("title companyId").populate("companyId", "name").lean() as Promise<
        ({ title?: string; companyId?: { name?: string } | unknown } | null)
      >,
    ]);
    const to = String(applicant?.email ?? "").trim();
    if (!to) continue;
    const companyName =
      typeof job?.companyId === "object" && job?.companyId !== null
        ? String((job.companyId as { name?: string }).name ?? "a company")
        : "a company";
    const enqueued = await enqueue({
      type: "application-reminder",
      to,
      userId: draft.applicantId,
      payload: {
        applicantName: applicant?.name || to,
        jobTitle: job?.title || "a job",
        companyName,
        resumeUrl: `${appUrl()}/dashboard/jobs`,
      },
      dedupeKey,
      priority: 1,
      sendAfter: now,
    });
    if (enqueued.status === "queued" || enqueued.status === "duplicate") {
      result.enqueued += 1;
    }
  }
  return result;
}
