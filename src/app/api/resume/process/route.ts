import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";
import dbConnect from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/authUser";
import UploadedResume from "@/models/UploadedResume";
import { aiContextFromAuthUser, extractResumeTextFromImages, parseResumeContent, GroqCallError, toAiErrorResponse } from "@/lib/ai";
import { EXTRACTION_VERSION } from "@/lib/ai/client";
import { claimExtractionSlot, completeExtraction, failExtraction } from "@/lib/extractionService";
import { fileToDataUrl, assertSupportedUpload } from "@/lib/resumeImprover";
import { FILE_HASH_PATTERN, MAX_PDF_PAGES } from "@/lib/pdfConstants";
import { InputExtractionError } from "@/lib/inputExtraction";

void UploadedResume;

export const runtime = "nodejs";

export async function POST(req: Request) {
  let claimedRecordId: { toString(): string } | null = null;
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const rawHash = formData.get("fileHash");
    const fileHash = typeof rawHash === "string" ? rawHash : "";
    if (!FILE_HASH_PATTERN.test(fileHash)) {
      return NextResponse.json({ error: "Invalid file hash" }, { status: 400 });
    }
    const rawTitle = formData.get("title");
    const title = typeof rawTitle === "string" ? rawTitle.trim().slice(0, 120) : "";

    const files = formData.getAll("resumeFile").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No resume file uploaded" }, { status: 400 });
    }
    if (files.length > MAX_PDF_PAGES) {
      return NextResponse.json({ error: `Maximum of ${MAX_PDF_PAGES} pages supported` }, { status: 400 });
    }
    for (const file of files) {
      assertSupportedUpload(file);
    }

    await dbConnect();
    const claim = await claimExtractionSlot({
      userId: authUser.userObjectId,
      fileHash,
      pageCount: files.length,
    });

    if (claim.outcome === "done") {
      return NextResponse.json({
        status: "done",
        pages: claim.pages,
        title: title || undefined,
        resumeContent: claim.parsedResume,
        rawExtractedText: claim.rawExtractedText,
        uploadedResumeId: String(claim.recordId),
      });
    }
    if (claim.outcome === "pending") {
      return NextResponse.json({ status: "pending" }, { status: 409 });
    }

    claimedRecordId = claim.recordId;
    if (title) {
      await UploadedResume.findByIdAndUpdate(claim.recordId, { $set: { title } }).catch(() => undefined);
    }

    const pages: string[] = [];
    for (const file of files) {
      const dataUrl = await fileToDataUrl(file);
      const result = await uploadImage(dataUrl, `resume-extractions/${String(authUser.userObjectId)}`);
      pages.push(result.secure_url);
    }

    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    const ctx = aiContextFromAuthUser(authUser);
    const extractedText = await extractResumeTextFromImages(dataUrls, ctx);
    if (!extractedText?.trim()) {
      throw new InputExtractionError("Could not extract readable text from this resume.", 422);
    }
    const parsedContent = await parseResumeContent(extractedText, ctx);

    await completeExtraction({
      recordId: claim.recordId,
      rawExtractedText: extractedText,
      parsedResume: parsedContent,
      pages,
    });

    await UploadedResume.findByIdAndUpdate(claim.recordId, {
      $setOnInsert: { extractionVersion: EXTRACTION_VERSION },
    }).catch(() => undefined);

    return NextResponse.json({
      status: "done",
      pages,
      title: title || undefined,
      resumeContent: parsedContent,
      rawExtractedText: extractedText,
      uploadedResumeId: String(claim.recordId),
    });
  } catch (error: unknown) {
    if (claimedRecordId) {
      try {
        const { Types } = await import("mongoose");
        await failExtraction(new Types.ObjectId(claimedRecordId.toString()));
      } catch {
        // ignore cleanup failure
      }
    }
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof GroqCallError) {
      const { status, error: message } = toAiErrorResponse(error, "Failed to process resume");
      return NextResponse.json({ error: message }, { status });
    }
    const message = error instanceof Error ? error.message : "Failed to process resume";
    if (message.includes("not supported") || message.includes("Upload") || message.includes("10MB")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("Resume process error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
