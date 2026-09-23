import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Activity from "@/models/Activity";
import { getAuthenticatedUser } from "@/lib/authUser";
import { recordActivity } from "@/lib/activityService";

void JobAd;
void Activity;

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const jobId = body?.jobId as string | undefined;

    if (!jobId || !Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ error: "Invalid jobId" }, { status: 400 });
    }

    await dbConnect();

    const job = await JobAd.findById(jobId).select("title status companyId slug");
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Job not found or not active" }, { status: 404 });
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recent = await Activity.findOne({
      actorId: authUser.userObjectId,
      type: "application_started",
      entityId: new Types.ObjectId(jobId),
      createdAt: { $gte: thirtyMinutesAgo },
    });

    if (recent) {
      return NextResponse.json({ success: true, deduplicated: true, activity: null });
    }

    const activity = await recordActivity({
      actorId: authUser.userObjectId,
      actorEmail: authUser.user.email || "",
      actorName: authUser.user.name || "",
      type: "application_started",
      title: `Started application for ${job.title}`,
      detail: `Opened application for ${job.title}`,
      entityType: "jobAd",
      entityId: job._id as Types.ObjectId,
      metadata: {
        jobId: String(job._id),
        jobTitle: job.title,
        slug: job.slug,
      },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    console.error("Error tracking application started:", error);
    return NextResponse.json({ error: "Failed to track activity" }, { status: 500 });
  }
}
