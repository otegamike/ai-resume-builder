import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import { analyzeResumeJobMatch } from "@/lib/ai";
import {
  InputExtractionError,
  resolveResumeInput,
} from "@/lib/inputExtraction";

void JobAd;

export const runtime = "nodejs";

type JobForText = {
  title?: string;
  description?: string;
  requirements?: string[];
  skillsRequired?: string[];
  benefits?: string[];
  location?: string;
  jobType?: string;
  workplaceType?: string;
  category?: string;
};

function jobToText(job: JobForText): string {
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
    const { resumeText, resumeId, upload } = await resolveResumeInput(formData, authUser);
    const resumeIdForTailor = resumeId ?? null;
    
    const analysis = await analyzeResumeJobMatch(resumeText, jobText);

    return NextResponse.json({ ...analysis, resumeIdForTailor });
  } catch (error) {
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Match analysis error:", error);
    const message = error instanceof Error ? error.message : "Failed to analyze match";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
