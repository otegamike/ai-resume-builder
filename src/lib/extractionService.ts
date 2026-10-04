import "server-only";

import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import UploadedResume from "@/models/UploadedResume";
import { EXTRACTION_VERSION } from "@/lib/ai/client";
import { STALE_EXTRACTION_MS } from "@/lib/pdfConstants";
import type { ResumeContent, UploadedResumeClient, UploadedResumeStatus } from "@/types/ResumeData";

void UploadedResume;

export interface UploadedResumeDocLike {
  _id: Types.ObjectId | string;
  title?: string;
  pages?: string[];
  userId?: Types.ObjectId | string;
  fileHash?: string;
  parsedResume?: ResumeContent;
  resumeTitle?: string;
}

export interface UploadedResumeListLike {
  _id: Types.ObjectId | string;
  title?: string;
  pages?: string[];
  userId?: Types.ObjectId | string;
  fileHash?: string;
  extractionVersion?: string;
  status?: string;
  pageCount?: number;
  resumeTitle?: string;
}

export function toUploadedResumeListItem(doc: UploadedResumeListLike): UploadedResumeClient {
  const storedTitle = typeof doc.title === "string" ? doc.title.trim() : "";
  const linkedTitle = typeof doc.resumeTitle === "string" ? doc.resumeTitle.trim() : "";
  const status: UploadedResumeStatus | undefined =
    doc.status === "done" || doc.status === "pending" || doc.status === "failed" ? doc.status : undefined;
  return {
    _id: String(doc._id),
    title: storedTitle || linkedTitle || "Uploaded Resume",
    pages: Array.isArray(doc.pages) ? doc.pages : [],
    ...(doc.userId ? { userId: String(doc.userId) } : {}),
    ...(doc.fileHash ? { fileHash: doc.fileHash } : {}),
    ...(doc.extractionVersion ? { extractionVersion: doc.extractionVersion } : {}),
    ...(status ? { status } : {}),
    ...(typeof doc.pageCount === "number" ? { pageCount: doc.pageCount } : {}),
  };
}

export function toUploadedResumeClient(doc: UploadedResumeDocLike): UploadedResumeClient {
  const storedTitle = typeof doc.title === "string" ? doc.title.trim() : "";
  const linkedTitle = typeof doc.resumeTitle === "string" ? doc.resumeTitle.trim() : "";
  return {
    _id: String(doc._id),
    title: storedTitle || linkedTitle || "Uploaded Resume",
    pages: Array.isArray(doc.pages) ? doc.pages : [],
    ...(doc.userId ? { userId: String(doc.userId) } : {}),
    ...(doc.fileHash ? { fileHash: doc.fileHash } : {}),
    ...(doc.parsedResume ? { parsedResume: doc.parsedResume } : {}),
  };
}

export type ClaimResult =
  | { outcome: "claimed"; recordId: Types.ObjectId }
  | { outcome: "done"; recordId: Types.ObjectId; rawExtractedText: string; parsedResume: ResumeContent; pages: string[] }
  | { outcome: "pending" };

interface ClaimParams {
  userId: Types.ObjectId;
  title: string;
  fileHash: string;
  pageCount: number;
}

export async function claimExtractionSlot(params: ClaimParams): Promise<ClaimResult> {
  const { userId, fileHash, pageCount, title } = params;
  await dbConnect();

  const staleDate = new Date(Date.now() - STALE_EXTRACTION_MS);

  const reclaimed = await UploadedResume.findOneAndUpdate(
    {
      userId,
      fileHash,
      extractionVersion: EXTRACTION_VERSION,
      $or: [{ status: "failed" }, { status: "pending", updatedAt: { $lt: staleDate } }],
    },
    { $set: { status: "pending", title, pageCount } },
    { new: true }
  );

  if (reclaimed) {
    return { outcome: "claimed", recordId: reclaimed._id as Types.ObjectId };
  }

  try {
    const created = await UploadedResume.create({
      userId,
      fileHash,
      extractionVersion: EXTRACTION_VERSION,
      status: "pending",
      title,
      pageCount,
    });
    return { outcome: "claimed", recordId: created._id as Types.ObjectId };
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code !== 11000) throw err;
  }

  const existing = await UploadedResume.findOne({ userId, fileHash, extractionVersion: EXTRACTION_VERSION });
  if (!existing) return { outcome: "pending" };
  if (existing.status === "done" && existing.parsedResume) {
    return {
      outcome: "done",
      recordId: existing._id as Types.ObjectId,
      rawExtractedText: (existing.rawExtractedText as string) ?? "",
      parsedResume: existing.parsedResume as ResumeContent,
      pages: (existing.pages as string[]) ?? [],
    };
  }
  return { outcome: "pending" };
}

interface CompleteParams {
  resumeId: Types.ObjectId;
  recordId: Types.ObjectId;
  rawExtractedText: string;
  parsedResume: ResumeContent;
  pages: string[];
}

export async function completeExtraction(params: CompleteParams): Promise<void> {
  await dbConnect();
  await UploadedResume.findByIdAndUpdate(params.recordId, {
    $set: {
      status: "done",
      resumeId: params.resumeId,
      rawExtractedText: params.rawExtractedText,
      parsedResume: params.parsedResume,
      pages: params.pages,
      pageCount: params.pages.length,
    },
  });
}

export async function failExtraction(recordId: Types.ObjectId): Promise<void> {
  await dbConnect();
  await UploadedResume.findByIdAndUpdate(recordId, { $set: { status: "failed" } });
}
