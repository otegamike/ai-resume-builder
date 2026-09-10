import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import User from "@/models/User";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";

void JobAd;
void JobApplication;
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

    const applicants = await JobApplication.find({ jobId: job._id, status: { $ne: "withdrawn" } })
      .sort({ createdAt: -1 })
      .populate("applicantId", "name email image location jobTitle phone");

    const mapped = applicants.map((a: any) => ({
      ...a.toObject(),
      user: a.applicantId,
      aiMatchScore: a.jobMatchAnalysis?.score ?? a.matchScore ?? 0,
      aiMatchAnalysis: a.jobMatchAnalysis?.verdict || a.analysisReport?.verdict || "",
      coverLetterText: a.coverLetterText,
      screeningAnswers: a.screeningAnswers,
    }));

    return NextResponse.json({ job, applicants: mapped });
  } catch (error: any) {
    console.error("Error fetching applicants:", error);
    return NextResponse.json({ error: "Failed to fetch applicants" }, { status: 500 });
  }
}
