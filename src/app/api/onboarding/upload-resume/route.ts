import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { aiContextFromAuthUser, GroqCallError, toAiErrorResponse } from "@/lib/ai";
import User from "@/models/User";
import {
  InputExtractionError,
  resolveUploadOnlyResumeInput,
} from "@/lib/inputExtraction";
import { createResume, createResumeFromExtractedText } from "@/lib/resumeService";
import { recordActivity } from "@/lib/activityService";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
      entityId: authUser.userObjectId as any,
      metadata: { resumeId: String(savedResume._id), targetRole, industry },
    }).catch((err) => console.error("Failed to record onboarding_completed:", err));

    return NextResponse.json({ resumeId: savedResume._id }, { status: 201 });
  } catch (error) {
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof GroqCallError) {
      const { status, error: message } = toAiErrorResponse(error, "Failed to process uploaded resume");
      return NextResponse.json({ error: message }, { status });
    }
    const message = error instanceof Error ? error.message : "Failed to process uploaded resume";
    if (message.includes("not supported") || message.includes("Upload") || message.includes("10MB")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Onboarding upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
