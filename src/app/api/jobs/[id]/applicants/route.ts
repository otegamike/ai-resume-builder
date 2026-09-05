import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Application from "@/models/Application";
import User from "@/models/User";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";

void JobAd;
void Application;
void User;
void Resume;
void CoverLetter;

export async function GET(
  req: Request,
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

    const applicants = await Application.find({ jobId: job._id })
      .sort({ createdAt: -1 })
      .populate("user", "name email image location jobTitle phone")
      .populate("resumeId", "title targetRole content updatedAt")
      .populate("coverLetterId", "title content updatedAt");

    return NextResponse.json({ job, applicants });
  } catch (error: any) {
    console.error("Error fetching applicants:", error);
    return NextResponse.json({ error: "Failed to fetch applicants" }, { status: 500 });
  }
}
