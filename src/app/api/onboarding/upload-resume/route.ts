import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { parseResumeContent } from "@/lib/ai";
import { assertSupportedUpload, extractTextFromPdf, fileToDataUrl, isPdfUpload, isImageUpload } from "@/lib/resumeImprover";
import { extractResumeTextFromImages } from "@/lib/ai";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import User from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    assertSupportedUpload(file);

    let extractedText = "";

    if (isPdfUpload(file)) {
      const result = await extractTextFromPdf(file);
      extractedText = result.text;
    } else if (isImageUpload(file)) {
      const dataUrl = await fileToDataUrl(file);
      extractedText = await extractResumeTextFromImages([dataUrl]);
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable text from this resume." },
        { status: 422 }
      );
    }

    let parsedContent;
    try {
      parsedContent = await parseResumeContent(extractedText);
    } catch {
      parsedContent = null;
    }

    const title = `Imported Resume - ${new Date().toLocaleDateString()}`;

    await dbConnect();
    const resume = new Resume({
      userId: authUser.legacyUserId || String(authUser.userObjectId),
      user: authUser.userObjectId,
      title,
      template: "template1",
      content: parsedContent ?? {
        personalInfo: {
          name: "",
          fullname: { firstName: "", otherNames: "" },
          jobTitle: "",
          email: "",
          phone: "",
          location: "",
          website: "",
        },
        summary: "",
        experience: [],
        education: [],
        projects: [],
        skills: [],
        skillCategories: [],
        skillCategorized: false,
      },
    });

    const savedResume = await resume.save();

    await User.findByIdAndUpdate(authUser.userObjectId, {
      $set: {
        hasExistingResume: true,
        hasCompletedOnboarding: true,
      },
    });

    return NextResponse.json({ resumeId: savedResume._id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process uploaded resume";
    if (message.includes("not supported") || message.includes("Upload") || message.includes("10MB")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Onboarding upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
