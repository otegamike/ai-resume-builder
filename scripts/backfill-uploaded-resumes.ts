/**
 * One-off migration: backfill new UploadedResume cache fields from the
 * linked Resume document.
 *
 * Fills (where recoverable): parsedResume, userId, status, pageCount,
 * extractionVersion. Skips rawExtractedText + fileHash (unrecoverable).
 * Idempotent: only touches docs missing parsedResume.
 *
 * Usage:
 *   npx tsx scripts/backfill-uploaded-resumes.ts            # write mode
 *   npx tsx scripts/backfill-uploaded-resumes.ts --dry-run  # preview only
 *
 * Requires MONGODB_URI in the environment (see .env.local).
 */
import mongoose from "mongoose";
import UploadedResume from "@/models/UploadedResume";
import Resume from "@/models/Resume";

void UploadedResume;
void Resume;

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Export it or add it to .env.local first.");
  }

  await mongoose.connect(uri, { dbName: "Resumy" });

  const docs = await UploadedResume.find({});
  let updated = 0;
  let alreadyFilled = 0;
  let missingResume = 0;

  for (const doc of docs) {
    const id = String(doc._id);
    if (doc.parsedResume) {
      console.log(`- ${id}: already has parsedResume, skipping`);
      alreadyFilled += 1;
      continue;
    }
    if (!doc.resumeId) {
      console.log(`- ${id}: no resumeId, skipping`);
      missingResume += 1;
      continue;
    }
    const resume = await Resume.findById(doc.resumeId);
    if (!resume || !resume.content) {
      console.log(`- ${id}: linked resume not found, skipping`);
      missingResume += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`- ${id}: would backfill from resume ${String(doc.resumeId)}`);
      updated += 1;
      continue;
    }

    doc.parsedResume = resume.content;
    if (resume.user) {
      doc.userId = resume.user;
    }
    doc.status = "done";
    doc.pageCount = Array.isArray(doc.pages) ? doc.pages.length : 0;
    doc.extractionVersion = "v1";
    await doc.save();
    console.log(`- ${id}: backfilled from resume ${String(doc.resumeId)}`);
    updated += 1;
  }

  console.log(`\nDone. Total: ${docs.length}, updated: ${updated}, already filled: ${alreadyFilled}, missing resume: ${missingResume}${DRY_RUN ? " (dry run, nothing written)" : ""}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
