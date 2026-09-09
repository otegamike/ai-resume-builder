import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import JobApplication from "@/models/JobApplication";
import Company from "@/models/Company";

void JobAd;
void JobApplication;
void Company;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in to apply for this position" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const job = await JobAd.findById(id).populate("companyId", "name");
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "This job listing is no longer active" }, { status: 404 });
    }

    const existing = await JobApplication.findOne({
      jobId: job._id,
      applicantId: session.user.id,
    });

    if (existing) {
      return NextResponse.json(
        { error: "You have already submitted an application for this position" },
        { status: 400 }
      );
    }

    const {
      resumeId,
      tailoredResumeId,
      resumeSnapshot,
      tailoredResumeSnapshot,
      matchScore,
      tailoredMatchScore,
      analysisReport,
      tailorReport,
      coverLetterText,
      coverLetterGenerated,
      customResumeUrl,
      screeningAnswers,
      source,
    } = await req.json();

    const applicationSource = source === "off_platform" ? "off_platform" : "platform";
    const normalizedScreeningAnswers = Array.isArray(screeningAnswers)
      ? screeningAnswers.map((answer: any) => ({
          questionId: String(answer.questionId || ""),
          question: String(answer.question || ""),
          answer: String(answer.answer || ""),
        }))
      : [];

    if (applicationSource === "platform") {
      const missingRequiredQuestion = (job.screeningQuestions || []).find((question: any) => {
        if (!question.required) return false;
        const matchingAnswer = normalizedScreeningAnswers.find(
          (answer: any) => answer.questionId === question.id
        );
        return !matchingAnswer?.answer.trim();
      });

      if (missingRequiredQuestion) {
        return NextResponse.json(
          { error: `Please answer: ${missingRequiredQuestion.question}` },
          { status: 400 }
        );
      }
    }

    if (applicationSource === "platform" && !analysisReport) {
      return NextResponse.json({ error: "Missing analysis report" }, { status: 400 });
    }

    const doc: any = {
      jobId: job._id,
      applicantId: session.user.id,
      companyId: (job.companyId as any)?._id || job.companyId,
      status: "submitted",
      resumeId: resumeId || undefined,
      tailoredResumeId: tailoredResumeId || undefined,
      resumeSnapshot,
      tailoredResumeSnapshot,
      matchScore: typeof matchScore === "number" ? matchScore : (analysisReport?.score ?? 0),
      tailoredMatchScore: typeof tailoredMatchScore === "number" ? tailoredMatchScore : undefined,
      analysisReport: analysisReport || { score: 0, missingKeywords: [], missingSkills: [], strengths: [], weaknesses: [], gaps: [], suggestions: [], verdict: "" },
      tailorReport: tailorReport || undefined,
      coverLetterText: coverLetterText || "",
      coverLetterGenerated: !!coverLetterGenerated,
      screeningAnswers: normalizedScreeningAnswers,
      customResumeUrl: customResumeUrl || "",
      source: applicationSource,
    };

    const newApplication = await JobApplication.create(doc);

    await JobAd.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });

    return NextResponse.json(
      {
        success: true,
        application: newApplication,
        message: "Application submitted successfully!",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "You have already submitted an application for this position" }, { status: 400 });
    }
    console.error("Error submitting job application:", error);
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}
