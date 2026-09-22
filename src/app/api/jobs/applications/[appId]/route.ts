import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";
import JobAd from "@/models/JobAd";
import { recordActivity } from "@/lib/activityService";

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
      (application as any).viewedByEmployer = true;
      (application as any).viewedAt = new Date();
    }

    if (notes !== undefined) {
      application.notes = notes;
    }

    await application.save();

    if (status && application.applicantId) {
      const jobForStatus = await JobAd.findById(application.jobId).select("title slug").catch(() => null);
      const jobTitleForStatus = jobForStatus?.title || "your application";
      recordActivity({
        actorId: currentUser._id as any,
        actorEmail: currentUser.email || "",
        actorName: currentUser.name || "",
        type: "application_status_changed",
        title: `Application moved to ${status} for ${jobTitleForStatus}`,
        detail: `Application for ${jobTitleForStatus} moved to ${status}`,
        entityType: "jobApplication",
        entityId: application._id as any,
        metadata: {
          jobId: String(application.jobId),
          applicationId: String(application._id),
          newStatus: status,
          jobTitle: jobTitleForStatus,
        },
        notifyRecipientIds: [application.applicantId as any],
        notificationType: "application_status_changed",
        notificationBody: `Your application for ${jobTitleForStatus} is now ${status}`,
        notificationLink: jobForStatus?.slug ? `/jobs/${jobForStatus.slug}` : "",
      }).catch((err) => console.error("Failed to record application_status_changed:", err));
    }

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error("Error updating application status:", error);
    return NextResponse.json({ error: "Failed to update application status" }, { status: 500 });
  }
}
