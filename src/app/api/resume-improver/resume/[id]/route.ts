import { NextRequest, NextResponse } from "next/server";
import { aiContextFromAuthUser, analyzeResumeForAts } from "@/lib/ai";
import { buildResumeOwnerQuery, getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import { resumeContentToText } from "@/lib/resumeImprover";
import Resume from "@/models/Resume";
import { deductCredits } from "@/lib/creditUtils";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

export const POST = withApiHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const newAiCredits = await deductCredits(String(authUser.userObjectId), "atsAnalysisSaved");
      const ctx = aiContextFromAuthUser(authUser);

      await dbConnect();
      const ownerQuery = buildResumeOwnerQuery(authUser.userObjectId);
      const resume = await Resume.findOne({ _id: id, ...ownerQuery });

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      const extractedText = resumeContentToText(resume.content);
      if (!extractedText) {
        return NextResponse.json(
          { error: "This resume does not have enough content to review." },
          { status: 422 }
        );
      }

      const report = await analyzeResumeForAts(extractedText, ctx, resume.content);
      return NextResponse.json({ ...report, newAiCredits });
    } catch (error) {
      return handleApiError(error, { route: "/api/resume-improver/resume/[id]", flow: "resume-improver" });
    }
  },
  { route: "/api/resume-improver/resume/[id]", flow: "resume-improver" }
);
