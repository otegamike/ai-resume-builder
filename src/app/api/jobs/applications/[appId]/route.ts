import { NextResponse } from "next/server";
import { after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";
import JobAd from "@/models/JobAd";
import { recordActivity } from "@/lib/activityService";
import { enqueue, dedupeKeys } from "@/lib/email/dispatcher";
import { drainOutbox } from "@/lib/email/drain";
import { appUrl } from "@/lib/email/site";

void JobAd;
void JobApplication;
void User;

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { appId } = await params;
    await dbConnect();

    const currentUser = await User.findById(session.user.id);
    const application = await JobApplication.findById(appId);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const isOwner =
      currentUser?.organizationId &&
      application.companyId &&
      String(application.companyId) === String(currentUser.organizationId);

    if (!currentUser?.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { status, notes } = await req.json();

    const allowed = ["submitted", "under_review", "shortlisted", "interviewing", "offered", "rejected", "withdrawn"];
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (status) {
      application.status = status;
      application.viewedByEmployer = true;
      application.viewedAt = new Date();
    }

    if (notes !== undefined) {
      application.notes = notes;
    }

    await application.save();

    if (status && application.applicantId) {
      const jobForStatus = await JobAd.findById(application.jobId)
        .select("title slug companyId")
        .populate("companyId", "name")
        .catch(() => null);
      const jobTitleForStatus = (jobForStatus as unknown as { title?: string } | null)?.title || "your application";
      const companyNameForStatus =
        (jobForStatus as unknown as { companyId?: { name?: string } | null } | null)?.companyId?.name ||
        "a company";
      recordActivity({
        actorId: currentUser._id,
        actorEmail: currentUser.email || "",
        actorName: currentUser.name || "",
        type: "application_status_changed",
        title: `Application moved to ${status} for ${jobTitleForStatus}`,
        detail: `Application for ${jobTitleForStatus} moved to ${status}`,
        entityType: "jobApplication",
        entityId: application._id,
        metadata: {
          jobId: String(application.jobId),
          applicationId: String(application._id),
          newStatus: status,
          jobTitle: jobTitleForStatus,
        },
        notifyRecipientIds: [application.applicantId],
        notificationType: "application_status_changed",
        notificationBody: `Your application for ${jobTitleForStatus} is now ${String(status).replace(/_/g, " ")}`,
        notificationLink: `/dashboard/jobs?tab=history`,
      }).catch((err) => console.error("Failed to record application_status_changed:", err));

      // Status-change email: the priority mail for applicants. Skipped for
      // withdrawals (the candidate's own action). Never fails the update.
      if (status !== "withdrawn") {
        try {
          const candidate = await User.findById(application.applicantId).select("email name").lean();
          const candidateEmail = String(candidate?.email || "").trim();
          if (candidateEmail) {
            const applicantName = candidate?.name || candidateEmail;
            await enqueue({
              type: "application-status-changed",
              to: candidateEmail,
              userId: application.applicantId,
              payload: {
                applicantName,
                jobTitle: jobTitleForStatus === "your application" ? "a job" : jobTitleForStatus,
                companyName: companyNameForStatus,
                status,
                historyUrl: `${appUrl()}/dashboard/jobs?tab=history`,
                jobsUrl: `${appUrl()}/jobs`,
              },
              dedupeKey: dedupeKeys.applicationStatusChanged(String(application._id), String(status)),
            });
            after(() => {
              drainOutbox({ limit: 5 }).catch((err) =>
                console.error("Status email drain failed:", err)
              );
            });
          }
        } catch (err) {
          console.error("Status email enqueue failed:", err);
        }
      }
    }

    return NextResponse.json({ success: true, application });
  } catch (error: unknown) {
    console.error("Error updating application status:", error);
    return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
  }
}
