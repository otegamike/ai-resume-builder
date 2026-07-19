import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { parseResumeContent, extractResumeTextFromImages } from "@/lib/ai";
import { assertSupportedUpload, fileToDataUrl } from "@/lib/resumeImprover";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import User from "@/models/User";
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const entries = formData.getAll("file");
    const files = entries.filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    for (const f of files) {
      assertSupportedUpload(f);
    }

    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    const extractedText = await extractResumeTextFromImages(dataUrls);

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
    const message = error instanceof Error ? error.message : "Failed to process uploaded resume";
    if (message.includes("not supported") || message.includes("Upload") || message.includes("10MB")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Onboarding upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
