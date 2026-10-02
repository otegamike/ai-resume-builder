import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/authUser";
import UploadedResume from "@/models/UploadedResume";
import { EXTRACTION_VERSION } from "@/lib/ai/client";
import { FILE_HASH_PATTERN, STALE_EXTRACTION_MS } from "@/lib/pdfConstants";
import { toUploadedResumeClient } from "@/lib/extractionService";
import type { UploadedResumeClient } from "@/types/ResumeData";

void UploadedResume;

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fileHash = "";
  try {
    const body: unknown = await req.json();
    const record = body as { fileHash?: unknown };
    fileHash = typeof record.fileHash === "string" ? record.fileHash : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!FILE_HASH_PATTERN.test(fileHash)) {
    return NextResponse.json({ error: "Invalid file hash" }, { status: 400 });
  }

  await dbConnect();
  const doc = await UploadedResume.findOne({
    userId: authUser.userObjectId,
    fileHash,
    extractionVersion: EXTRACTION_VERSION,
  });

  if (!doc) {
    return NextResponse.json({ status: "miss" });
  }

  if (doc.status === "done") {
    await doc.populate("resumeId", "title");
    const linked = doc.resumeId as unknown as { title?: string } | null;
    const client = toUploadedResumeClient({
      _id: doc._id,
      title: typeof doc.title === "string" ? doc.title : "",
      pages: (doc.pages as string[]) ?? [],
      userId: doc.userId,
      fileHash: typeof doc.fileHash === "string" ? doc.fileHash : undefined,
      parsedResume: (doc.parsedResume as UploadedResumeClient["parsedResume"]) ?? undefined,
      resumeTitle: linked?.title,
    });
    return NextResponse.json({
      status: "done",
      pages: client.pages,
      title: client.title,
      resumeContent: (doc.parsedResume as unknown) ?? null,
      rawExtractedText: (doc.rawExtractedText as string) ?? "",
      uploadedResumeId: String(doc._id),
    });
  }

  if (doc.status === "pending") {
    const updatedAt = doc.updatedAt ? new Date(doc.updatedAt).getTime() : 0;
    if (Date.now() - updatedAt < STALE_EXTRACTION_MS) {
      return NextResponse.json({ status: "pending" });
    }
    return NextResponse.json({ status: "miss" });
  }

  return NextResponse.json({ status: "miss" });
}
