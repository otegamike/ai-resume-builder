import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import User from "@/models/User";
import {
  InputExtractionError,
  resolveUploadOnlyResumeInput,
} from "@/lib/inputExtraction";
import { createResumeFromExtractedText } from "@/lib/resumeService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const extractedText = await resolveUploadOnlyResumeInput(formData, "file");

    const savedResume = await createResumeFromExtractedText({
      authUser,
      extractedText,
    });

    await User.findByIdAndUpdate(authUser.userObjectId, {
      $set: {
        hasExistingResume: true,
        hasCompletedOnboarding: true,
      },
    });

    return NextResponse.json({ resumeId: savedResume._id }, { status: 201 });
  } catch (error) {
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to process uploaded resume";
    if (message.includes("not supported") || message.includes("Upload") || message.includes("10MB")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Onboarding upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
