import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { aiContextFromAuthUser } from "@/lib/ai";
import User from "@/models/User";
import { resolveUploadOnlyResumeInput } from "@/lib/inputExtraction";
import { createResume, createResumeFromExtractedText } from "@/lib/resumeService";
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

      const formData = await request.formData();
      const ctx = aiContextFromAuthUser(authUser);
      const { text: extractedText, content } = await resolveUploadOnlyResumeInput(formData, ctx, "file", authUser);

      const savedResume = content
        ? await createResume({
            authUser,
            title: `Imported Resume - ${new Date().toLocaleDateString()}`,
            content,
          })
        : await createResumeFromExtractedText({
            authUser,
            extractedText,
            ctx,
          });

      const name = formData.get("name")?.toString().trim() || "";
      const jobTitle = formData.get("jobTitle")?.toString() || "";
      const location = formData.get("location")?.toString() || "";
      const phone = formData.get("phone")?.toString() || "";
      const industry = formData.get("industry")?.toString() || "";
      const targetRole = formData.get("targetRole")?.toString() || formData.get("targetField")?.toString() || "";
      const targetField = targetRole || industry;
      let primaryGoal: string[] = [];
      const rawGoal = formData.get("primaryGoal")?.toString() || "";
      if (rawGoal) {
        try {
          const parsed = JSON.parse(rawGoal);
          if (Array.isArray(parsed)) primaryGoal = parsed.filter((v) => typeof v === "string");
        } catch {
          primaryGoal = rawGoal ? [rawGoal] : [];
        }
      }

      const update: Record<string, unknown> = {
        jobTitle,
        location,
        phone,
        targetField,
        industry,
        targetRole,
        primaryGoal,
        hasExistingResume: true,
        hasCompletedOnboarding: true,
      };
      if (name) update.name = name;

      await User.findByIdAndUpdate(authUser.userObjectId, {
        $set: update,
      });

      recordActivity({
        actorId: authUser.userObjectId,
        actorEmail: authUser.user.email || "",
        actorName: authUser.user.name || "",
        type: "onboarding_completed",
        title: "Completed onboarding",
        detail: `Imported resume and completed onboarding`,
        entityType: "user",
        entityId: authUser.userObjectId,
        metadata: { resumeId: String(savedResume._id), targetRole, industry },
      }).catch((err) => console.error("Failed to record onboarding_completed:", err));

      return NextResponse.json({ resumeId: savedResume._id }, { status: 201 });
    } catch (error) {
      return handleApiError(error, { route: "/api/onboarding/upload-resume", flow: "onboarding" });
    }
  },
  { route: "/api/onboarding/upload-resume", flow: "onboarding" }
);
