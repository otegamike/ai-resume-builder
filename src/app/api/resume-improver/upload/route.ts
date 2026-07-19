import { NextResponse } from "next/server";
import { analyzeResumeForAts, extractResumeTextFromImages } from "@/lib/ai";
import { getAuthenticatedUser } from "@/lib/authUser";
import {
  assertSupportedUpload,
  fileToDataUrl,
} from "@/lib/resumeImprover";
import { deductCredits, InsufficientCreditsError } from "@/lib/creditUtils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const newAiCredits = await deductCredits(String(authUser.userObjectId), "atsAnalysisUpload");

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

    const report = await analyzeResumeForAts(extractedText);

    return NextResponse.json({ ...report, newAiCredits });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: error.message, creditsRemaining: error.creditsRemaining, cost: error.cost },
        { status: 402 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Failed to analyze uploaded resume";
    const status = message.includes("not supported") || message.includes("Upload")
      ? 400
      : 500;

    console.error("Resume upload analysis error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
