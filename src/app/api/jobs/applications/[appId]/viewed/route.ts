import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobApplication from "@/models/JobApplication";
import JobAd from "@/models/JobAd";
import User from "@/models/User";

void JobApplication;
void JobAd;
void User;

export async function POST(
  _req: Request,
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
    const job = await JobAd.findById(application.jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const isOwner =
      currentUser?.organizationId &&
      String(job.companyId) === String(currentUser.organizationId);
    if (!currentUser?.isAdmin && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (application.viewedByEmployer) {
      return NextResponse.json({ success: true, alreadyViewed: true });
    }
    application.viewedByEmployer = true;
    application.viewedAt = new Date();
    await application.save();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error marking application viewed:", error);
    return NextResponse.json({ error: "Failed to mark viewed" }, { status: 500 });
  }
}
