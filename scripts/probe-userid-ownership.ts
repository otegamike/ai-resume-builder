/**
 * Phase 0 probe: ownership field audit across user-owned collections.
 *
 * Read-only. Never writes. Reports, per collection/field:
 * total docs, missing field, string values, ObjectId values, other types,
 * and whether each distinct owner value resolves to a real User.
 *
 * Usage:
 *   npx tsx scripts/probe-userid-ownership.ts
 *   npx tsx scripts/probe-userid-ownership.ts --out ownership-report.json
 *
 * Requires MONGODB_URI in the environment or .env.local.
 */
import mongoose, { Types } from "mongoose";
import fs from "node:fs";
import path from "node:path";

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

interface FieldProbe {
  collection: string;
  field: string;
  expected: string;
  total: number;
  missing: number;
  byType: Record<string, number>;
  distinctStringValues: string[];
  distinctStringTruncated: boolean;
  danglingValues: Array<{ value: string; count: number; userExists: boolean; resolvedUserId: string | null }>;
}

interface CollectionReport {
  collection: string;
  total: number;
  fields: FieldProbe[];
  orphanSamples?: Array<Record<string, unknown>>;
}

async function probeField(
  collection: mongoose.mongo.Collection,
  collectionName: string,
  field: string,
  expected: string,
  total: number,
  userIds: Set<string>
): Promise<FieldProbe> {
  const missing = await collection.countDocuments({
    $or: [{ [field]: { $exists: false } }, { [field]: null }],
  });

  const typeAgg = (await collection
    .aggregate([
      { $match: { [field]: { $exists: true, $ne: null } } },
      { $group: { _id: { $type: `$${field}` }, count: { $sum: 1 } } },
    ])
    .toArray()) as Array<{ _id: string; count: number }>;
  const byType: Record<string, number> = {};
  for (const row of typeAgg) byType[String(row._id)] = row.count;

  const distinct = (await collection.distinct(field, {
    [field]: { $type: "string" },
  })) as unknown[];
  const stringValues = distinct.filter((v): v is string => typeof v === "string");
  const MAX_DISTINCT = 100;
  const danglingValues: FieldProbe["danglingValues"] = [];
  for (const value of stringValues.slice(0, MAX_DISTINCT)) {
    const count = await collection.countDocuments({ [field]: value });
    let userExists = false;
    let resolvedUserId: string | null = null;
    if (OBJECT_ID_PATTERN.test(value)) {
      const user = await mongoose.connection
        .collection("users")
        .findOne({ _id: new Types.ObjectId(value) }, { projection: { _id: 1 } });
      userExists = !!user;
      if (userExists) {
        resolvedUserId = value.toLowerCase();
        userIds.add(resolvedUserId);
      }
    } else {
      // Pre-NextAuth accounts (e.g. Clerk ids) may still map to a User
      // through a linked OAuth account.
      const user = (await mongoose.connection.collection("users").findOne(
        { "oauthAccounts.providerAccountId": value },
        { projection: { _id: 1 } }
      )) as unknown as { _id: unknown } | null;
      if (user?._id) {
        userExists = true;
        resolvedUserId = String(user._id);
        userIds.add(resolvedUserId.toLowerCase());
      }
    }
    danglingValues.push({ value, count, userExists, resolvedUserId });
  }

  return {
    collection: collectionName,
    field,
    expected,
    total,
    missing,
    byType,
    distinctStringValues: stringValues.slice(0, MAX_DISTINCT),
    distinctStringTruncated: stringValues.length > MAX_DISTINCT,
    danglingValues,
  };
}

async function main() {
  loadEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Export it or add it to .env.local first.");
  }

  await mongoose.connect(uri, { dbName: "Resumy" });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle after connect.");
  const userIds = new Set<string>();
  const reports: CollectionReport[] = [];

  const plan: Array<{ collection: string; fields: Array<{ field: string; expected: string }> }> = [
    {
      collection: "resumes",
      fields: [
        { field: "userId", expected: "string (legacy, to remove)" },
        { field: "user", expected: "objectId (required target)" },
      ],
    },
    {
      collection: "coverletters",
      fields: [
        { field: "userId", expected: "string (legacy, to remove)" },
        { field: "user", expected: "objectId (required target)" },
      ],
    },
    {
      collection: "applications",
      fields: [
        { field: "userId", expected: "string (legacy, to remove)" },
        { field: "user", expected: "objectId (required target)" },
      ],
    },
    {
      collection: "uploadedresumes",
      fields: [{ field: "userId", expected: "objectId (required target)" }],
    },
    {
      collection: "jobapplications",
      fields: [{ field: "applicantId", expected: "objectId" }],
    },
    {
      collection: "draftjobapplications",
      fields: [{ field: "applicantId", expected: "objectId" }],
    },
    {
      collection: "jobads",
      fields: [{ field: "postedBy", expected: "objectId" }],
    },
  ];

  for (const { collection: name, fields } of plan) {
    const names = await db.listCollections({ name }).toArray();
    if (names.length === 0) {
      console.log(`- ${name}: collection does not exist, skipping`);
      continue;
    }
    const collection = db.collection(name);
    const total = await collection.estimatedDocumentCount();
    const report: CollectionReport = { collection: name, total, fields: [] };
    for (const { field, expected } of fields) {
      report.fields.push(await probeField(collection, name, field, expected, total, userIds));
    }
    reports.push(report);
  }

  // Orphan samples: quarantined-candidate docs whose owner resolves to no user.
  // For each collection with string userIds, sample up to 5 docs per dangling value.
  for (const report of reports) {
    for (const field of report.fields) {
      const dangling = field.danglingValues.filter((d) => !d.userExists);
      if (dangling.length === 0) continue;
      const collection = db.collection(report.collection);
      const samples: Array<Record<string, unknown>> = [];
      for (const d of dangling.slice(0, 20)) {
        const docs = (await collection
          .find({ [field.field]: d.value })
          .project({ title: 1, role: 1, company: 1, status: 1, updatedAt: 1, createdAt: 1, content: 1, parsedResume: 1 })
          .limit(5)
          .toArray()) as Array<Record<string, unknown>>;
        for (const doc of docs) {
          samples.push({
            collection: report.collection,
            ownerValue: d.value,
            _id: String(doc._id),
            title: doc.title ?? doc.role ?? null,
            company: doc.company ?? null,
            status: doc.status ?? null,
            updatedAt: doc.updatedAt ?? null,
            contactEmail: extractContactEmail(doc.content ?? doc.parsedResume),
          });
        }
      }
      report.orphanSamples = samples;
    }
  }

  // Cross-links: for each dangling owner value, count linked resumes /
  // job applications / uploaded resumes carrying the same string userId.
  const danglingOwners = new Set<string>();
  for (const report of reports) {
    for (const field of report.fields) {
      for (const d of field.danglingValues) {
        if (!d.userExists) danglingOwners.add(d.value);
      }
    }
  }
  const crossLinks: Array<{ owner: string; resumes: number; jobApplications: number; uploadedResumes: number; emails: string[]; emailMatchedUsers: Array<{ email: string; userId: string }> }> = [];
  for (const owner of [...danglingOwners].slice(0, 100)) {
    const [resumes, jobApplications, uploadedResumes, resumeContents, uploadContents] = await Promise.all([
      db.collection("resumes").countDocuments({ userId: owner }),
      db.collection("jobapplications").countDocuments({ applicantId: owner }),
      db.collection("uploadedresumes").countDocuments({ userId: owner }),
      db.collection("resumes").find({ userId: owner }).project({ content: 1 }).limit(50).toArray(),
      db.collection("uploadedresumes").find({ userId: owner }).project({ parsedResume: 1 }).limit(50).toArray(),
    ]);
    const emails = new Set<string>();
    for (const doc of [...resumeContents, ...uploadContents] as Array<Record<string, unknown>>) {
      const email = extractContactEmail(doc.content ?? doc.parsedResume);
      if (email) emails.add(email);
    }
    // Candidate accounts only: an email match never migrates anything on its
    // own; it just tells the reviewer who may be affected.
    const emailMatchedUsers: Array<{ email: string; userId: string }> = [];
    for (const email of emails) {
      const user = (await db.collection("users").findOne(
        { email },
        { projection: { _id: 1 } }
      )) as unknown as { _id: unknown } | null;
      if (user?._id) emailMatchedUsers.push({ email, userId: String(user._id) });
    }
    crossLinks.push({ owner, resumes, jobApplications, uploadedResumes, emails: [...emails], emailMatchedUsers });
  }

  const output = { generatedAt: new Date().toISOString(), reports, crossLinks };

  for (const report of reports) {
    console.log(`\n== ${report.collection} (total ${report.total}) ==`);
    for (const field of report.fields) {
      console.log(
        `  ${field.field} [${field.expected}]: missing=${field.missing} types=${JSON.stringify(field.byType)}`
      );
      for (const d of field.danglingValues) {
        const where = d.userExists && d.resolvedUserId
          ? `(resolves to User ${d.resolvedUserId})`
          : "(DANGLING)";
        console.log(`    - ${JSON.stringify(d.value)} x${d.count} ${where}`);
      }
      if (field.distinctStringTruncated) console.log("    ... distinct list truncated at 100");
    }
    if (report.orphanSamples?.length) {
      console.log(`  orphan samples (${report.orphanSamples.length} shown):`);
      for (const s of report.orphanSamples.slice(0, 15)) {
        console.log(
          `    - ${String(s._id)} title=${JSON.stringify(s.title)} email=${JSON.stringify(s.contactEmail ?? null)} status=${JSON.stringify(s.status)} owner=${JSON.stringify(s.ownerValue)}`
        );
      }
    }
  }
  if (crossLinks.length) {
    console.log("\n== affected owners (quarantine candidates) ==");
    for (const c of crossLinks) {
      console.log(
        `  ${JSON.stringify(c.owner)}: resumes=${c.resumes} jobApplications=${c.jobApplications} uploadedResumes=${c.uploadedResumes}`
      );
      console.log(`    emails: ${c.emails.length ? c.emails.map((e) => JSON.stringify(e)).join(", ") : "none found"}`);
      for (const m of c.emailMatchedUsers) {
        console.log(`    candidate account: ${JSON.stringify(m.email)} -> user ${m.userId} (report only, not linked)`);
      }
    }
  }

  if (OUT_FILE) {
    fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\nFull report written to ${OUT_FILE}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Probe failed:", err);
  process.exitCode = 1;
});
