import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { parseResumeContent } from "@/lib/ai";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import User from "@/models/User";
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
import {
  InputExtractionError,
  resolveUploadOnlyResumeInput,
} from "@/lib/inputExtraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const extractedText = await resolveUploadOnlyResumeInput(formData, "file");

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
      template: getRandomTemplateId(templateDefinitions),
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
