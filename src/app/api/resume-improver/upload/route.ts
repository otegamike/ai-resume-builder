import { NextResponse } from "next/server";
import { aiContextFromAuthUser, analyzeResumeForAts } from "@/lib/ai";
import { getAuthenticatedUser } from "@/lib/authUser";
import { deductCredits } from "@/lib/creditUtils";
import { resolveUploadOnlyResumeInput } from "@/lib/inputExtraction";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

export const POST = withApiHandler(
  async (request: Request) => {
      try {
        const authUser = await getAuthenticatedUser();
        if (!authUser) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const newAiCredits = await deductCredits(String(authUser.userObjectId), "atsAnalysisUpload");
        const ctx = aiContextFromAuthUser(authUser);

        const formData = await request.formData();
        const { text: extractedText } = await resolveUploadOnlyResumeInput(formData, ctx, "file", authUser);

        const report = await analyzeResumeForAts(extractedText, ctx);

        return NextResponse.json({ ...report, newAiCredits });
      } catch (error) {
        return handleApiError(error, {
          route: "/api/resume-improver/upload",
          flow: "resume-improver",
        });
      }
    },
  { route: "/api/resume-improver/upload", flow: "resume-improver" }
);
