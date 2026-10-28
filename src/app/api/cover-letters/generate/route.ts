import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getAuthenticatedUser } from "@/lib/authUser";
import { aiContextFromAuthUser, generateCoverLetter } from "@/lib/ai";
import dbConnect from "@/lib/db";
import CoverLetter from "@/models/CoverLetter";
import { deductCredits } from "@/lib/creditUtils";
import {
  resolveJobInput,
  resolveResumeInput,
} from "@/lib/inputExtraction";
import { recordActivity } from "@/lib/activityService";
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

      const newAiCredits = await deductCredits(String(authUser.userObjectId), "coverLetterGenerate");
      const ctx = aiContextFromAuthUser(authUser);

      const formData = await request.formData();
      const resumeMode = formData.get("resumeMode") as string;
      const targetCompany = (formData.get("targetCompany") as string) || "";
      const targetRole = (formData.get("targetRole") as string) || "";

      const { resumeText, existingResume } = await resolveResumeInput(formData, authUser, ctx);
      const jobDescriptionText = await resolveJobInput(formData, ctx);

      // 3. Generate cover letter via AI
      const coverLetterResult = await generateCoverLetter(
        resumeText,
        jobDescriptionText,
        ctx,
        targetCompany,
        targetRole,
        existingResume
      );
      const coverLetterContent = coverLetterResult.content;
      const inferredRole = coverLetterResult.inferredRole;

      // 4. Save to database
      await dbConnect();
      const title = targetRole && targetCompany
        ? `Cover Letter — ${targetRole} at ${targetCompany}`
        : targetRole
          ? `Cover Letter — ${targetRole}`
          : "Cover Letter";

      const coverLetter = new CoverLetter({
        user: authUser.userObjectId,
        title,
        targetCompany,
        targetRole,
        content: coverLetterContent,
        jobDescription: jobDescriptionText,
        resumeId: resumeMode === "saved" ? (formData.get("resumeId") as string) : undefined,
        status: "draft",
      });

      const saved = await coverLetter.save();

      recordActivity({
        actorId: authUser.userObjectId,
        actorEmail: authUser.user.email || "",
        actorName: authUser.user.name || "",
        type: "cover_letter_generated",
        title: `Generated cover letter for ${targetRole || "role"}${targetCompany ? ` at ${targetCompany}` : ""}`,
        detail: title,
        entityType: "coverLetter",
        entityId: saved._id as Types.ObjectId,
        metadata: { title, targetCompany, targetRole },
      }).catch((err) => console.error("Failed to record cover_letter_generated:", err));

      return NextResponse.json({
        id: saved._id,
        title: saved.title,
        content: coverLetterContent,
        targetCompany,
        targetRole,
        inferredRole,
        newAiCredits,
      });
    } catch (error) {
      return handleApiError(error, { route: "/api/cover-letters/generate", flow: "cover-letters" });
    }
  },
  { route: "/api/cover-letters/generate", flow: "cover-letters" }
);
