import { NextResponse } from "next/server";
import { analyzeResumeForAts, extractResumeTextFromImage } from "@/lib/ai";
import { getAuthenticatedUser } from "@/lib/authUser";
import {
  assertSupportedUpload,
  extractTextFromPdf,
  fileToDataUrl,
  isImageUpload,
  isPdfUpload,
} from "@/lib/resumeImprover";
import { AtsIssue } from "@/types/AtsReport";

export const runtime = "nodejs";

const scannedPdfIssue: AtsIssue = {
  severity: "high",
  section: "formatting",
  title: "Resume text is not selectable",
  detail:
    "Your resume does not have enough selectable text. ATS systems may miss most or all of the information because the content appears to be image-based.",
  suggestion:
    "Use a text-based PDF export instead of a scanned or image-only PDF so ATS systems can reliably read your resume.",
};

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    assertSupportedUpload(file);

    let extractedText = "";
    let hasScannedPdfWarning = false;
    if (isPdfUpload(file)) {
      const pdfExtraction = await extractTextFromPdf(file);
      extractedText = pdfExtraction.text;
      hasScannedPdfWarning = pdfExtraction.source === "pdf-vision";
    } else if (isImageUpload(file)) {
      extractedText = await extractResumeTextFromImage(await fileToDataUrl(file));
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable text from this resume." },
        { status: 422 }
      );
    }

    const report = await analyzeResumeForAts(extractedText);
    if (hasScannedPdfWarning) {
      report.issues = [scannedPdfIssue, ...report.issues];
    }

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze uploaded resume";
    const status = message.includes("not supported") || message.includes("Upload")
      ? 400
      : message.includes("selectable text")
        ? 422
        : 500;

    console.error("Resume upload analysis error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
