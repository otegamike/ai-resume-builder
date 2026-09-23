import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";
import User from "@/models/User";
import { recordActivity } from "@/lib/activityService";

void JobAd;
void Company;
void User;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "";
    const query: any = {};

    if (status) {
      query.status = status;
    }

    const jobs = await JobAd.find(query)
      .sort({ createdAt: -1 })
      .populate("companyId", "name logo website location isVerified")
      .populate("postedBy", "name email");

    const counts = {
      pending_review: await JobAd.countDocuments({ status: "pending_review" }),
      active: await JobAd.countDocuments({ status: "active" }),
      rejected: await JobAd.countDocuments({ status: "rejected" }),
      total: await JobAd.countDocuments({}),
    };

    return NextResponse.json({ jobs, counts });
  } catch (error: any) {
    console.error("Error fetching admin jobs:", error);
    return NextResponse.json({ error: "Failed to fetch admin jobs" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    await dbConnect();

    const { jobId, action, rejectionReason, isFeatured, isPinned, isVerifiedCompany } = await req.json();

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const job = await JobAd.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job ad not found" }, { status: 404 });
    }

    const previousStatus = job.status;

    if (action === "approve") {
      job.status = "active";
      job.rejectionReason = "";
    } else if (action === "reject") {
      job.status = "rejected";
      job.rejectionReason = rejectionReason || "Violates community job ad standards or potential scam alert.";
    }

    if (isFeatured !== undefined) job.isFeatured = isFeatured;
    if (isPinned !== undefined) job.isPinned = isPinned;

    await job.save();

    if (isVerifiedCompany !== undefined && job.companyId) {
      await Company.updateOne({ _id: job.companyId }, { isVerified: isVerifiedCompany });
    }

    const moderator = await User.findById(session.user.id).catch(() => null);
    const statusChanged = action === "approve" || action === "reject";
    if (statusChanged) {
      const newStatus = job.status;
      recordActivity({
        actorId: moderator?._id as any || job.postedBy as any,
        actorEmail: moderator?.email || "",
        actorName: moderator?.name || "",
        type: "job_status_changed",
        title: `Admin ${action === "approve" ? "approved" : "rejected"} job "${job.title}"`,
        detail: `Job "${job.title}" ${action === "approve" ? "approved" : "rejected"} by admin`,
        entityType: "jobAd",
        entityId: job._id as any,
        metadata: { slug: job.slug, previousStatus, newStatus, action, rejectionReason: job.rejectionReason },
        notifyRecipientIds: job.postedBy ? [job.postedBy as any] : [],
        notificationType: "job_status_changed",
        notificationBody: `Your job "${job.title}" was ${action === "approve" ? "approved and published" : "rejected"}`,
        notificationLink: `/dashboard/employers/job/${String(job._id)}`,
      }).catch((err) => console.error("Failed to record admin moderate:", err));
    }

    return NextResponse.json({
      success: true,
      job,
      message: `Job ad ${action === "approve" ? "approved & published" : action === "reject" ? "rejected" : "updated"} successfully.`,
    });
  } catch (error: any) {
    console.error("Error moderating job ad:", error);
    return NextResponse.json({ error: "Failed to moderate job ad" }, { status: 500 });
  }
}
