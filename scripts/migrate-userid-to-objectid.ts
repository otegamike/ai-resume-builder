/**
 * One-off migration: replace legacy string-based ownership with ObjectId `user`.
 *
 * Stage 1 (default, dry-run safe): for resumes, coverletters, applications,
 * and uploadedresumes, backfill the ObjectId owner from the legacy string
 * `userId` wherever it resolves to a real User.
 *
 * Docs whose owner resolves to no User are QUARANTINED: left untouched in the
 * database and listed in a report (with linked resume / job-application /
 * uploaded-resume data) so nothing is silently deleted or orphaned further.
 *
 * Stage 2 (`--unset-legacy`): after the new code is deployed and verified,
 * remove the legacy string `userId` field from docs that already have `user`.
 * Run this only after Phase 4 code changes are live.
 *
 * Usage:
 *   npx tsx scripts/migrate-userid-to-objectid.ts --dry-run
 *   npx tsx scripts/migrate-userid-to-objectid.ts --write
 *   npx tsx scripts/migrate-userid-to-objectid.ts --write --unset-legacy
 *   npx tsx scripts/migrate-userid-to-objectid.ts --write --out migration-report.json
 *
 * Requires MONGODB_URI in the environment or .env.local.
 */
import mongoose, { Types } from "mongoose";
import fs from "node:fs";
import path from "node:path";

const DRY_RUN = !process.argv.includes("--write");
const UNSET_LEGACY = process.argv.includes("--unset-legacy");
const OUT_FILE = (() => {
  const idx = process.argv.indexOf("--out");
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

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

// Best-effort contact email from a stored resume content block. Used only
// for quarantine reporting (identifying affected users), never for writes.
function extractContactEmail(content: unknown): string | null {
  if (typeof content !== "object" || content === null) return null;
  const personalInfo = (content as Record<string, unknown>).personalInfo;
  if (typeof personalInfo !== "object" || personalInfo === null) return null;
  const email = (personalInfo as Record<string, unknown>).email;
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
}

interface QuarantinedDoc {
  collection: string;
  _id: string;
  ownerValue: unknown;
  title: unknown;
  company: unknown;
  status: unknown;
  updatedAt: unknown;
  contactEmail: string | null;
  matchedUserByEmail: { userId: string; email: string } | null;
}

interface CollectionStats {
  collection: string;
  scanned: number;
  backfilledUser: number;
  normalizedUserId: number;
  alreadyOk: number;
  quarantined: number;
  legacyUnset: number;
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Export it or add it to .env.local first.");
  }
  if (UNSET_LEGACY && DRY_RUN) {
    console.log("Note: --unset-legacy has no effect without --write (dry run).");
  }

  await mongoose.connect(uri, { dbName: "Resumy" });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle after connect.");

  const userCache = new Map<string, boolean>();
  async function userExists(idHex: string): Promise<boolean> {
    const key = idHex.toLowerCase();
    const cached = userCache.get(key);
    if (cached !== undefined) return cached;
    const user = await db!.collection("users").findOne(
      { _id: new Types.ObjectId(idHex) },
      { projection: { _id: 1 } }
    );
    const exists = !!user;
    userCache.set(key, exists);
    // Keep the cache bounded; owner cardinality is small in practice.
    if (userCache.size > 10000) userCache.clear();
    return exists;
  }

  // Resolves a legacy string owner to a User _id: direct ObjectId match
  // first, then linked OAuth accounts (e.g. pre-NextAuth Clerk ids).
  async function resolveOwner(rawOwner: unknown): Promise<Types.ObjectId | null> {
    if (typeof rawOwner !== "string") return null;
    if (OBJECT_ID_PATTERN.test(rawOwner) && (await userExists(rawOwner))) {
      return new Types.ObjectId(rawOwner);
    }
    if (!OBJECT_ID_PATTERN.test(rawOwner)) {
      const user = (await db!.collection("users").findOne(
        { "oauthAccounts.providerAccountId": rawOwner },
        { projection: { _id: 1 } }
      )) as unknown as { _id: unknown } | null;
      if (user?._id) return new Types.ObjectId(String(user._id));
    }
    return null;
  }

  const quarantined: QuarantinedDoc[] = [];
  const stats: CollectionStats[] = [];

  // Fills the affected-user fields of a quarantine entry. Report only: an
  // email that matches a registered User is shown as a candidate account and
  // never triggers ownership changes on its own.
  async function enrichQuarantine(base: QuarantinedDoc, content: unknown): Promise<void> {
    const email = extractContactEmail(content);
    base.contactEmail = email;
    base.matchedUserByEmail = null;
    if (email) {
      const user = (await db!.collection("users").findOne(
        { email },
        { projection: { _id: 1 } }
      )) as unknown as { _id: unknown } | null;
      if (user?._id) {
        base.matchedUserByEmail = { userId: String(user._id), email };
      }
    }
  }

  // Collections with a legacy string `userId` plus an ObjectId `user` field.
  const dualField = ["resumes", "coverletters", "applications"] as const;

  for (const name of dualField) {
    const names = await db.listCollections({ name }).toArray();
    if (names.length === 0) {
      console.log(`- ${name}: collection does not exist, skipping`);
      continue;
    }
    const collection = db.collection(name);
    const st: CollectionStats = {
      collection: name,
      scanned: 0,
      backfilledUser: 0,
      normalizedUserId: 0,
      alreadyOk: 0,
      quarantined: 0,
      legacyUnset: 0,
    };

    // Docs missing the ObjectId owner are the migration candidates.
    const cursor = collection.find({
      $or: [{ user: { $exists: false } }, { user: null }],
    });
    for await (const doc of cursor) {
      st.scanned += 1;
      const rawOwner: unknown = (doc as Record<string, unknown>).userId;
      const base: QuarantinedDoc = {
        collection: name,
        _id: String(doc._id),
        ownerValue: rawOwner ?? null,
        title: (doc as Record<string, unknown>).title ?? (doc as Record<string, unknown>).role ?? null,
        company: (doc as Record<string, unknown>).company ?? null,
        status: (doc as Record<string, unknown>).status ?? null,
        updatedAt: (doc as Record<string, unknown>).updatedAt ?? null,
        contactEmail: null,
        matchedUserByEmail: null,
      };
      const resolved = await resolveOwner(rawOwner);
      if (resolved) {
        if (!DRY_RUN) {
          await collection.updateOne({ _id: doc._id }, { $set: { user: resolved } });
        }
        st.backfilledUser += 1;
        console.log(`- ${name} ${base._id}: ${DRY_RUN ? "would set" : "set"} user ${String(resolved)} from userId ${JSON.stringify(rawOwner)}`);
      } else {
        await enrichQuarantine(base, (doc as Record<string, unknown>).content);
        quarantined.push(base);
        st.quarantined += 1;
        console.log(
          `- ${name} ${base._id}: QUARANTINED (owner ${JSON.stringify(rawOwner)} resolves to no User), email=${JSON.stringify(base.contactEmail)}${base.matchedUserByEmail ? ` candidate=${base.matchedUserByEmail.userId}` : ""}, left untouched`
        );
      }
    }

    const okCount = await collection.countDocuments({
      user: { $type: "objectId" },
    });
    st.alreadyOk = okCount;

    if (UNSET_LEGACY && !DRY_RUN) {
      const res = await collection.updateMany(
        { user: { $type: "objectId" }, userId: { $type: "string" } },
        { $unset: { userId: "" } }
      );
      st.legacyUnset = res.modifiedCount;
      console.log(`- ${name}: removed legacy userId from ${res.modifiedCount} docs`);
    } else if (UNSET_LEGACY) {
      const count = await collection.countDocuments({
        user: { $type: "objectId" },
        userId: { $type: "string" },
      });
      console.log(`- ${name}: would remove legacy userId from ${count} docs`);
    }

    stats.push(st);
  }

  // Uploaded resumes: userId itself must be an ObjectId.
  {
    const name = "uploadedresumes";
    const names = await db.listCollections({ name }).toArray();
    if (names.length === 0) {
      console.log(`- ${name}: collection does not exist, skipping`);
    } else {
      const collection = db.collection(name);
      const st: CollectionStats = {
        collection: name,
        scanned: 0,
        backfilledUser: 0,
        normalizedUserId: 0,
        alreadyOk: 0,
        quarantined: 0,
        legacyUnset: 0,
      };
      const cursor = collection.find({
        $or: [
          { userId: { $exists: false } },
          { userId: null },
          { userId: { $type: "string" } },
        ],
      });
      for await (const doc of cursor) {
        st.scanned += 1;
        const rawOwner: unknown = (doc as Record<string, unknown>).userId;
        const base: QuarantinedDoc = {
          collection: name,
          _id: String(doc._id),
          ownerValue: rawOwner ?? null,
          title: (doc as Record<string, unknown>).title ?? null,
          company: null,
          status: (doc as Record<string, unknown>).status ?? null,
          updatedAt: (doc as Record<string, unknown>).updatedAt ?? null,
          contactEmail: null,
          matchedUserByEmail: null,
        };
        if (typeof rawOwner === "string" && OBJECT_ID_PATTERN.test(rawOwner) && (await userExists(rawOwner))) {
          if (!DRY_RUN) {
            await collection.updateOne(
              { _id: doc._id },
              { $set: { userId: new Types.ObjectId(rawOwner) } }
            );
          }
          st.normalizedUserId += 1;
          console.log(`- ${name} ${base._id}: ${DRY_RUN ? "would convert" : "converted"} string userId to ObjectId`);
        } else {
          // Non-hex ids can't live in an ObjectId field; quarantine whatever
          // doesn't resolve, so apply keeps rejecting it instead of crashing.
          const resolved = await resolveOwner(rawOwner);
          if (resolved && !DRY_RUN) {
            await collection.updateOne(
              { _id: doc._id },
              { $set: { userId: resolved } }
            );
          }
          if (resolved) {
            st.normalizedUserId += 1;
            console.log(`- ${name} ${base._id}: ${DRY_RUN ? "would convert" : "converted"} legacy owner to ObjectId ${String(resolved)}`);
          } else {
            await enrichQuarantine(base, (doc as Record<string, unknown>).parsedResume);
            quarantined.push(base);
            st.quarantined += 1;
            console.log(
              `- ${name} ${base._id}: QUARANTINED (owner ${JSON.stringify(rawOwner)} resolves to no User), email=${JSON.stringify(base.contactEmail)}${base.matchedUserByEmail ? ` candidate=${base.matchedUserByEmail.userId}` : ""}, left untouched`
            );
          }
        }
      }
      st.alreadyOk = await collection.countDocuments({ userId: { $type: "objectId" } });
      stats.push(st);
    }
  }

  // Cross-links for quarantined owners, as requested: linked resumes,
  // job applications, and uploaded resumes per owner value.
  const crossLinks: Array<{
    owner: unknown;
    resumes: number;
    jobApplications: number;
    uploadedResumes: number;
  }> = [];
  const owners = [...new Set(quarantined.map((q) => JSON.stringify(q.ownerValue)))].map(
    (s) => JSON.parse(s) as unknown
  );
  for (const owner of owners.slice(0, 200)) {
    const [resumes, jobApplications, uploadedResumes] = await Promise.all([
      db.collection("resumes").countDocuments({ userId: owner }),
      db.collection("jobapplications").countDocuments({ applicantId: owner }),
      db.collection("uploadedresumes").countDocuments({ userId: owner }),
    ]);
    crossLinks.push({ owner, resumes, jobApplications, uploadedResumes });
  }

  console.log("\n== summary ==");
  for (const st of stats) {
    console.log(
      `  ${st.collection}: scanned=${st.scanned} backfilled=${st.backfilledUser} normalized=${st.normalizedUserId} alreadyOk=${st.alreadyOk} quarantined=${st.quarantined} legacyUnset=${st.legacyUnset}${DRY_RUN ? " (dry run, nothing written)" : ""}`
    );
  }
  console.log(`  quarantined total: ${quarantined.length}`);
  if (quarantined.length) {
    console.log("  affected users (report only, nothing linked):");
    for (const q of quarantined) {
      console.log(
        `    - ${q.collection} ${q._id} title=${JSON.stringify(q.title)} email=${JSON.stringify(q.contactEmail)}${q.matchedUserByEmail ? ` candidate account ${q.matchedUserByEmail.userId} (${q.matchedUserByEmail.email})` : " no matching account"}`
      );
    }
  }
  if (crossLinks.length) {
    console.log("  cross-links per quarantined owner:");
    for (const c of crossLinks) {
      console.log(
        `    ${JSON.stringify(c.owner)}: resumes=${c.resumes} jobApplications=${c.jobApplications} uploadedResumes=${c.uploadedResumes}`
      );
    }
  }

  if (OUT_FILE) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), dryRun: DRY_RUN, stats, quarantined, crossLinks }, null, 2));
    console.log(`\nFull report written to ${OUT_FILE}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
