import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Application from "@/models/Application";
import Company from "@/models/Company";
import Resume from "@/models/Resume";
import CoverLetter from "@/models/CoverLetter";

void JobAd;
void Application;
void Company;
void Resume;
void CoverLetter;

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

    // Check if candidate already applied for this job ad
    const existingApplication = await Application.findOne({
      jobId: job._id,
      user: session.user.id,
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already submitted an application for this position" },
        { status: 400 }
      );
    }

    const {
      resumeId,
      coverLetterId,
      customResumeUrl,
      coverLetterText,
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

    let aiMatchScore: number | undefined = undefined;
    let aiMatchAnalysis: string = "";

    // Compute AI match score if candidate selected a resume
    if (resumeId) {
      const selectedResume = await Resume.findById(resumeId);
      if (selectedResume) {
        const reqText = `${job.title} ${job.description} ${(job.skillsRequired || []).join(" ")}`.toLowerCase();
        const resumeText = JSON.stringify(selectedResume.content || {}).toLowerCase();

        let matches = 0;
        const skills = (job.skillsRequired && job.skillsRequired.length > 0)
          ? job.skillsRequired
          : ["experience", "developer", "management", "design"];

        skills.forEach((skill: string) => {
          if (resumeText.includes(skill.toLowerCase())) matches++;
        });

        const baseScore = Math.round((matches / Math.max(skills.length, 1)) * 40) + 55;
        aiMatchScore = Math.min(Math.max(baseScore, 60), 98);
        aiMatchAnalysis = `Resume matches ${matches} key skills listed in the job post (${skills.join(", ")}).`;
      }
    }

    const companyName = (job.companyId as any)?.name || "Hiring Organization";

    const newApplication = await Application.create({
      userId: session.user.id,
      user: session.user.id,
      company: companyName,
      role: job.title,
      status: "applied",
      appliedDate: new Date(),
      notes:
        applicationSource === "off_platform"
          ? "Confirmed off-platform application from Resumy AI Job Board"
          : "Submitted via Resumy AI Job Board",
      jobId: job._id,
      companyId: job.companyId?._id || job.companyId,
      resumeId: resumeId || undefined,
      coverLetterId: coverLetterId || undefined,
      coverLetterText: coverLetterText || "",
      customResumeUrl: customResumeUrl || "",
      aiMatchScore,
      aiMatchAnalysis,
      screeningAnswers: normalizedScreeningAnswers,
      source: applicationSource,
    });

    // Increment applications count on job ad
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
    console.error("Error submitting job application:", error);
    return NextResponse.json({ error: error.message || "Failed to submit application" }, { status: 500 });
  }
}
