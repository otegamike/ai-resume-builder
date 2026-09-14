import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";

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
    await JobApplication.updateMany(
      { jobId: job._id, viewedByEmployer: { $ne: true } },
      { $set: { viewedByEmployer: true, viewedAt: new Date() } }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error marking viewed:", error);
    return NextResponse.json({ error: "Failed to mark viewed" }, { status: 500 });
  }
}
