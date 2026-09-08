import { NextResponse } from "next/server";
import { getAuthenticatedUser, buildResumeOwnerQuery } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Resume from "@/models/Resume";
import { analyzeResumeJobMatch, extractResumeTextFromImages } from "@/lib/ai";
import { fileToDataUrl, resumeContentToText } from "@/lib/resumeImprover";

void JobAd;
void Resume;

export const runtime = "nodejs";

function jobToText(job: any): string {
  const parts = [
    job.title,
    job.description?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    Array.isArray(job.requirements) ? job.requirements.join("\n") : "",
    Array.isArray(job.skillsRequired) ? job.skillsRequired.join(", ") : "",
    Array.isArray(job.benefits) ? job.benefits.join("\n") : "",
    job.location,
    job.jobType,
    job.workplaceType,
    job.category,
  ];
  return parts.filter(Boolean).join("\n\n");
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const job = await JobAd.findById(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const jobText = jobToText(job);
    if (!jobText.trim()) return NextResponse.json({ error: "Job has no readable content" }, { status: 422 });

    const formData = await req.formData();
    const resumeMode = formData.get("resumeMode") as string;

    let resumeText = "";
    let resumeIdForTailor: string | null = null;

    if (resumeMode === "saved") {
      const resumeId = formData.get("resumeId") as string;
      if (!resumeId) return NextResponse.json({ error: "No resume selected" }, { status: 400 });
      const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId, authUser.legacyUserId);
      const resume = await Resume.findOne({ _id: resumeId, ...ownerQuery });
      if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      resumeText = resumeContentToText(resume.content);
      resumeIdForTailor = resumeId;
    } else if (resumeMode === "upload") {
      const files = formData.getAll("resumeFile").filter((f): f is File => f instanceof File);
      if (files.length === 0) return NextResponse.json({ error: "No resume file uploaded" }, { status: 400 });
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      resumeText = await extractResumeTextFromImages(dataUrls);
    } else {
      return NextResponse.json({ error: "Invalid resume mode" }, { status: 400 });
    }

    if (!resumeText.trim()) return NextResponse.json({ error: "Could not extract resume text" }, { status: 422 });

    const analysis = await analyzeResumeJobMatch(resumeText, jobText);

    return NextResponse.json({ ...analysis, resumeIdForTailor });
  } catch (error) {
    console.error("Match analysis error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze match";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
