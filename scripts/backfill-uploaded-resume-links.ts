/**
 * One-off migration: link pre-change UploadedResume records to a Resume.
 *
 * Since resume processing started creating the Resume at upload time,
 * every finished upload is expected to carry resumeId. Records finished
 * before that change have parsed content but no link, which the apply
 * route now requires. This script creates the missing Resume docs and
 * links them. Idempotent: only touches done docs missing resumeId.
 *
 * Usage:
 *   npx tsx scripts/backfill-uploaded-resume-links.ts            # write mode
 *   npx tsx scripts/backfill-uploaded-resume-links.ts --dry-run  # preview only
 *
 * Requires MONGODB_URI in the environment (see .env.local).
 */
import mongoose, { Types } from "mongoose";
import UploadedResume from "@/models/UploadedResume";
import { createResume } from "@/lib/resumeService";
import type { ResumeContent } from "@/types/ResumeData";

void UploadedResume;

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Export it or add it to .env.local first.");
  }

  await mongoose.connect(uri, { dbName: "Resumy" });

  const docs = await UploadedResume.find({
    status: "done",
    $or: [{ resumeId: { $exists: false } }, { resumeId: null }],
  });
  let linked = 0;
  let skipped = 0;

  for (const doc of docs) {
    const id = String(doc._id);
    if (!doc.parsedResume || !doc.userId) {
      console.log(`- ${id}: missing parsed content or owner, skipping`);
      skipped += 1;
      continue;
    }
    const title = typeof doc.title === "string" && doc.title.trim()
      ? doc.title.trim()
      : `Uploaded Resume - ${new Date().toLocaleDateString()}`;

    if (DRY_RUN) {
      console.log(`- ${id}: would create resume "${title}" and link it`);
      linked += 1;
      continue;
    }

    const resume = await createResume({
      authUser: { userObjectId: doc.userId as Types.ObjectId, legacyUserId: "" },
      title,
      content: doc.parsedResume as ResumeContent,
    });
    doc.resumeId = resume._id as Types.ObjectId;
    await doc.save();
    console.log(`- ${id}: linked resume ${String(resume._id)}`);
    linked += 1;
  }

  console.log(`\nDone. Total: ${docs.length}, linked: ${linked}, skipped: ${skipped}${DRY_RUN ? " (dry run, nothing written)" : ""}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
