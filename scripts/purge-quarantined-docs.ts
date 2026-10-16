/**
 * One-off purge: permanently delete the 12 quarantined ownerless documents
 * (8 resumes + 4 uploaded resumes) identified by the ownership probe.
 *
 * Safety design:
 * - Explicit id allowlist only. Never pattern-based. Unknown ids are refused.
 * - Reference check first: aborts if any id is still referenced by drafts,
 *   pinned resumes, cover letters, or tracker applications.
 * - Backup gate: --write refuses to delete unless a backup file containing
 *   all 12 full documents (including page images) was just written by this run.
 * - Dry run by default. Nothing is written without --write.
 *
 * Usage:
 *   npx tsx scripts/purge-quarantined-docs.ts --dry-run
 *   npx tsx scripts/purge-quarantined-docs.ts --write --backup-out quarantine-backup.json
 *
 * Requires MONGODB_URI in the environment or .env.local.
 */
import mongoose, { Types } from "mongoose";
import fs from "node:fs";
import path from "node:path";

const DRY_RUN = !process.argv.includes("--write");
const BACKUP_OUT = (() => {
  const idx = process.argv.indexOf("--backup-out");
  return idx >= 0 && process.argv[idx + 1] ? String(process.argv[idx + 1]) : null;
})();

function loadEnvLocal() {
  if (process.env.MONGODB_URI) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

// Explicit allowlist from the quarantine reports. Nothing else may be deleted.
const RESUME_IDS = [
  "69eb4a59a9151673545d869c",
  "69f0812aa7eb8625196158be",
  "69f5dddd915fa5c5fbc85f3f",
  "69ffb51c78e742add135e185",
  "69f5dfb3915fa5c5fbc85f4c",
  "69f6f8e5e29521e89b367484",
  "69ff5c6ab4ef041121447797",
  "69f70e88f7f86570bc9ad4a4",
];

const UPLOAD_IDS = [
  "6abe38ee7fc9e32c609dd587",
  "6abe608841c5cc887353f601",
  "6abf67c7bd6741d6ce126f9a",
  "6abf9baec609e78fe149763c",
];

const HEX_PATTERN = /^[a-f0-9]{24}$/i;

function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.map((id) => {
    if (!HEX_PATTERN.test(id)) throw new Error(`Refusing to delete malformed id: ${id}`);
    return new Types.ObjectId(id);
  });
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Export it or add it to .env.local first.");
  }
  if (!DRY_RUN && !BACKUP_OUT) {
    throw new Error("Refusing to delete without a backup: pass --backup-out <file>.");
  }

  await mongoose.connect(uri, { dbName: "Resumy" });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle after connect.");

  const resumeOids = toObjectIds(RESUME_IDS);
  const uploadOids = toObjectIds(UPLOAD_IDS);

  // 1. Reference check: abort if anything still points at these docs.
  const references: string[] = [];
  const draftRefs = await db.collection("draftjobapplications").countDocuments({
    $or: [
      { "resume.resumeId": { $in: RESUME_IDS } },
      { "resume.uploadedResumeId": { $in: UPLOAD_IDS } },
    ],
  });
  if (draftRefs > 0) references.push(`${draftRefs} draft application(s)`);
  const pinnedRefs = await db.collection("users").countDocuments({
    pinnedResume: { $in: [...RESUME_IDS, ...UPLOAD_IDS] },
  });
  if (pinnedRefs > 0) references.push(`${pinnedRefs} pinned resume(s)`);
  const coverRefs = await db.collection("coverletters").countDocuments({
    resumeId: { $in: resumeOids },
  });
  if (coverRefs > 0) references.push(`${coverRefs} cover letter(s)`);
  const trackerRefs = await db.collection("applications").countDocuments({
    resumeId: { $in: resumeOids },
  });
  if (trackerRefs > 0) references.push(`${trackerRefs} tracker application(s)`);

  if (references.length > 0) {
    console.error(`ABORT: allowlisted docs are still referenced by ${references.join(", ")}. Resolve first.`);
    await mongoose.disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("Reference check clean: no drafts, pins, cover letters, or tracker apps point at these docs.");

  // 2. Load full documents for the backup.
  const [resumes, uploads] = await Promise.all([
    db.collection("resumes").find({ _id: { $in: resumeOids } }).toArray(),
    db.collection("uploadedresumes").find({ _id: { $in: uploadOids } }).toArray(),
  ]);
  const foundIds = new Set([...resumes, ...uploads].map((d) => String(d._id)));
  const missing = [...RESUME_IDS, ...UPLOAD_IDS].filter((id) => !foundIds.has(id.toLowerCase()));
  if (missing.length > 0) {
    console.error(`ABORT: ${missing.length} allowlisted doc(s) not found in DB: ${missing.join(", ")}`);
    await mongoose.disconnect();
    process.exitCode = 1;
    return;
  }

  const backup = {
    generatedAt: new Date().toISOString(),
    reason: "quarantine purge: ownerless documents with no link path to any user",
    resumes,
    uploadedResumes: uploads,
  };

  if (DRY_RUN) {
    const bytes = Buffer.byteLength(JSON.stringify(backup));
    console.log(
      `Dry run: would back up ${resumes.length} resumes + ${uploads.length} uploads (~${(bytes / 1024 / 1024).toFixed(1)} MB) and delete all 12. Nothing written.`
    );
    await mongoose.disconnect();
    return;
  }

  // 3. Backup gate: write and re-verify before deleting.
  const backupPath = BACKUP_OUT as string;
  fs.writeFileSync(backupPath, JSON.stringify(backup));
  const reloaded = JSON.parse(fs.readFileSync(backupPath, "utf8")) as {
    resumes?: unknown[];
    uploadedResumes?: unknown[];
  };
  if (reloaded.resumes?.length !== resumes.length || reloaded.uploadedResumes?.length !== uploads.length) {
    console.error("ABORT: backup verification failed, nothing deleted.");
    await mongoose.disconnect();
    process.exitCode = 1;
    return;
  }
  console.log(`Backup verified at ${backupPath} (${resumes.length} resumes + ${uploads.length} uploads).`);

  // 4. Delete by explicit id only.
  const [resumeRes, uploadRes] = await Promise.all([
    db.collection("resumes").deleteMany({ _id: { $in: resumeOids } }),
    db.collection("uploadedresumes").deleteMany({ _id: { $in: uploadOids } }),
  ]);
  console.log(`Deleted ${resumeRes.deletedCount} resumes + ${uploadRes.deletedCount} uploaded resumes.`);
  if (resumeRes.deletedCount !== resumes.length || uploadRes.deletedCount !== uploads.length) {
    console.error("WARNING: deleted count differs from backup count. Review immediately.");
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Purge failed:", err);
  process.exitCode = 1;
});
