import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";
import { recordActivity } from "@/lib/activityService";

void JobAd;
void JobApplication;
void User;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    await dbConnect();
    const currentUser = await User.findById(session.user.id);
    const job = await JobAd.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job ad not found" }, { status: 404 });
    }
    const isOwner =
      currentUser?.organizationId &&
      String(job.companyId) === String(currentUser.organizationId);
    if (!currentUser?.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await JobApplication.updateMany(
      { jobId: job._id, viewedByEmployer: { $ne: true } },
      { $set: { viewedByEmployer: true, viewedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      const affected = await JobApplication.find({ jobId: job._id })
        .select("applicantId")
        .limit(100);
      const applicantIds = Array.from(new Set(affected.map((a) => String(a.applicantId)))).map(
        (id) => affected.find((a) => String(a.applicantId) === id)!.applicantId as any
      );

      if (applicantIds.length > 0) {
        recordActivity({
          actorId: currentUser._id as any,
          actorEmail: currentUser.email || "",
          actorName: currentUser.name || "",
          type: "application_viewed_by_employer",
          title: `Employer viewed applications for ${job.title}`,
          detail: `Employer viewed ${result.modifiedCount} application(s) for ${job.title}`,
          entityType: "jobAd",
          entityId: job._id as any,
          metadata: { jobId: String(job._id), jobTitle: job.title, count: result.modifiedCount },
          notifyRecipientIds: applicantIds,
          notificationType: "application_viewed_by_employer",
          notificationBody: `An employer viewed your application for ${job.title}`,
          notificationLink: `/jobs/${job.slug}`,
        }).catch((err) => console.error("Failed to record viewedByEmployer:", err));
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking viewed:", error);
    return NextResponse.json({ error: "Failed to mark viewed" }, { status: 500 });
  }
}
