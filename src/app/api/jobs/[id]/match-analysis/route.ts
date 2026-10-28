import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import { aiContextFromAuthUser, analyzeResumeJobMatch } from "@/lib/ai";
import { resolveResumeInput } from "@/lib/inputExtraction";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";
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

export const POST = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
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
      const ctx = aiContextFromAuthUser(authUser);
      const { resumeText } = await resolveResumeInput(formData, authUser, ctx);

      const analysis = await analyzeResumeJobMatch(resumeText, jobText, ctx);

      return NextResponse.json(analysis);
    } catch (error) {
      return handleApiError(error, { route: "/api/jobs/[id]/match-analysis", flow: "jobs" });
    }
  },
  { route: "/api/jobs/[id]/match-analysis", flow: "jobs" }
);
