/**
 * One-off migration: embed parsed resume content into JobApplication
 * uploadedResume subdocs.
 *
 * New applications embed title + parsedResume at creation (see the apply
 * route). Records created before that change carry only {_id, resumeId,
 * pages}, so the simplified viewer has no readable text. This script fills
 * (where recoverable) from the UploadedResume collection, falling back to
 * the application's own embedded resume.content snapshot.
 * Idempotent: only touches uploaded-type docs missing parsedResume.
 *
 * Usage:
 *   npx tsx scripts/backfill-job-application-uploads.ts            # write mode
 *   npx tsx scripts/backfill-job-application-uploads.ts --dry-run  # preview only
 *
 * Requires MONGODB_URI in the environment (see .env.local).
 */
import mongoose from "mongoose";
import JobApplication from "@/models/JobApplication";
import UploadedResume from "@/models/UploadedResume";

void JobApplication;
void UploadedResume;

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Export it or add it to .env.local first.");
  }

  await mongoose.connect(uri, { dbName: "Resumy" });

  const docs = await JobApplication.find({
    resumeType: "uploaded",
    $or: [
      { uploadedResume: { $exists: false } },
      { "uploadedResume.parsedResume": { $exists: false } },
      { "uploadedResume.parsedResume": null },
    ],
  });

  let fromUpload = 0;
  let fromSnapshot = 0;
  let alreadyFilled = 0;
  let unrecoverable = 0;

  for (const doc of docs) {
    const id = String(doc._id);
    const embedded = doc.uploadedResume as unknown as
      | { _id?: unknown; title?: unknown; parsedResume?: unknown }
      | undefined;

    if (embedded?.parsedResume) {
      console.log(`- ${id}: already has parsedResume, skipping`);
      alreadyFilled += 1;
      continue;
    }

    const uploadedId = embedded?._id;
    let parsed: unknown = null;
    let title: unknown = null;
    let source = "";

    if (uploadedId) {
      const cached = await UploadedResume.findById(uploadedId);
      if (cached?.parsedResume) {
        parsed = cached.parsedResume;
        title = cached.title;
        source = `uploaded resume ${String(uploadedId)}`;
      }
    }

    if (!parsed) {
      const snapshot = (doc.resume as unknown as { content?: unknown } | undefined)?.content;
      if (snapshot) {
        parsed = snapshot;
        source = "embedded resume.content snapshot";
      }
    }

    if (!parsed) {
      console.log(`- ${id}: no uploaded record and no resume snapshot, skipping`);
      unrecoverable += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`- ${id}: would fill parsedResume from ${source}`);
      if (source.startsWith("uploaded resume")) fromUpload += 1;
      else fromSnapshot += 1;
      continue;
    }

    await JobApplication.updateOne(
      { _id: doc._id },
      {
        $set: {
          "uploadedResume.parsedResume": parsed,
          ...(typeof title === "string" && title.trim() && !embedded?.title
            ? { "uploadedResume.title": title }
            : {}),
        },
      }
    );
    console.log(`- ${id}: filled parsedResume from ${source}`);
    if (source.startsWith("uploaded resume")) fromUpload += 1;
    else fromSnapshot += 1;
  }

  console.log(
    `\nDone. Total: ${docs.length}, from uploads: ${fromUpload}, from snapshots: ${fromSnapshot}, already filled: ${alreadyFilled}, unrecoverable: ${unrecoverable}${DRY_RUN ? " (dry run, nothing written)" : ""}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
