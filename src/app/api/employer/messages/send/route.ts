import { NextResponse } from "next/server";
import { after } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";
import User from "@/models/User";
import Company from "@/models/Company";
import { getAuthenticatedUser } from "@/lib/authUser";
import { recordActivity } from "@/lib/activityService";
import { enqueue, dedupeKeys, isValidEmail } from "@/lib/email/dispatcher";
import { drainOutbox } from "@/lib/email/drain";
import { appUrl } from "@/lib/email/site";
import { canComposeMessages } from "@/lib/email/permissions";

void JobApplication;
void JobAd;
void User;
void Company;

type ReplyMode = "hiring" | "custom" | "dontreply";

interface ComposeBody {
  applicationId: string;
  subject: string;
  body: string;
  replyMode: ReplyMode;
  replyTo: string;
  contactEmail: string;
}

export function parseComposeBody(input: unknown): ComposeBody | { error: string } {
  if (!input || typeof input !== "object") return { error: "Invalid request body" };
  const record = input as Record<string, unknown>;
  const applicationId = String(record.applicationId ?? "");
  if (!applicationId || !Types.ObjectId.isValid(applicationId)) {
    return { error: "Valid applicationId is required" };
  }
  const subject = String(record.subject ?? "").trim();
  if (!subject) return { error: "Subject is required" };
  if (subject.length > 120) return { error: "Subject must be 120 characters or fewer" };
  const body = String(record.body ?? "").trim();
  if (!body) return { error: "Message body is required" };
  if (body.length > 5000) return { error: "Message body must be 5000 characters or fewer" };

  const rawMode = String(record.replyMode ?? "hiring");
  const replyMode: ReplyMode =
    rawMode === "custom" || rawMode === "dontreply" ? rawMode : "hiring";
  const replyTo = String(record.replyTo ?? "").trim();
  if (replyMode === "custom" && !isValidEmail(replyTo)) {
    return { error: "A valid reply-to email is required for custom mode" };
  }
  const contactEmail = String(record.contactEmail ?? "").trim();
  if (replyMode === "dontreply" && !isValidEmail(contactEmail)) {
    return { error: "A valid contact email is required for do-not-reply mode" };
  }
  return { applicationId, subject, body, replyMode, replyTo, contactEmail };
}

/**
 * Send a manual message to a candidate. Admin-only. The recipient is resolved
 * server-side from the application — the request never carries a `to`
 * address, so this endpoint cannot be used as a spam relay.
 */
export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canComposeMessages(authUser.session?.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = parseComposeBody(await req.json().catch(() => null));
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await dbConnect();
    const application = await JobApplication.findById(parsed.applicationId);
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const [candidate, job] = await Promise.all([
      User.findById(application.applicantId).select("email name").lean(),
      JobAd.findById(application.jobId)
        .select("title companyId")
        .populate("companyId", "name")
        .lean(),
    ]);
    const candidateEmail = String(candidate?.email || "").trim();
    if (!candidateEmail) {
      return NextResponse.json({ error: "Candidate has no email address" }, { status: 400 });
    }
    const jobDoc = job as unknown as {
      title?: string;
      companyId?: { name?: string } | null;
    } | null;
    const jobTitle = jobDoc?.title || "a job";
    const companyName =
      jobDoc?.companyId && typeof jobDoc.companyId === "object"
        ? jobDoc.companyId.name || "a company"
        : "a company";
    const applicantName = candidate?.name || candidateEmail;

    let activityId: Types.ObjectId | undefined;
    try {
      const activity = await recordActivity({
        actorId: authUser.userObjectId,
        actorEmail: authUser.user.email || "",
        actorName: authUser.user.name || "",
        type: "candidate_messaged",
        title: `New message about ${jobTitle}`,
        detail: `Hiring team messaged ${applicantName} about ${jobTitle}`,
        entityType: "jobApplication",
        entityId: application._id as Types.ObjectId,
        metadata: {
          jobId: String(application.jobId),
          applicationId: String(application._id),
          jobTitle,
        },
        notificationType: "candidate_messaged",
        perRecipientNotifications: [
          {
            recipientId: application.applicantId as Types.ObjectId,
            type: "candidate_messaged",
            title: `New message about ${jobTitle}`,
            body: `The hiring team sent you a message about your ${jobTitle} application.`,
            link: "/dashboard/jobs?tab=history",
          },
        ],
      });
      activityId = activity?._id as Types.ObjectId | undefined;
    } catch (err) {
      console.error("Failed to record candidate_messaged:", err);
    }

    try {
      await enqueue({
        type: "candidate-message",
        to: candidateEmail,
        userId: application.applicantId,
        payload: {
          applicantName,
          jobTitle,
          companyName,
          subject: parsed.subject,
          messageBody: parsed.body,
          replyMode: parsed.replyMode,
          replyTo: parsed.replyTo,
          contactEmail: parsed.contactEmail,
          historyUrl: `${appUrl()}/dashboard/jobs?tab=history`,
        },
        dedupeKey: dedupeKeys.candidateMessage(String(application._id)),
        priority: 1,
        relatedActivityId: activityId,
      });
      after(() => {
        drainOutbox({ limit: 5 }).catch((err) =>
          console.error("Candidate message drain failed:", err)
        );
      });
    } catch (err) {
      console.error("Candidate message enqueue failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error sending candidate message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
