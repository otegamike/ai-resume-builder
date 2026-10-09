import { afterAll, describe, expect, it } from "vitest";
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import EmailOutbox from "@/models/EmailOutbox";
import { getEmailConfig, resetEmailConfigForTests } from "../config";
import { enqueue } from "../dispatcher";
import { drainOutbox } from "../drain";
import { renderEmail } from "../render";
import { getQuotaUsage, releaseQuotaUnits } from "../quota";
import { startTestDb, stopTestDb } from "./testDb";

// Most runners do not read env files automatically; the shared setup file
// already loaded .env.test.local, this is belt-and-braces for direct runs.
loadEnvConfig(process.cwd());

const recipient = (process.env.EMAIL_TEST_RECIPIENT ?? "").trim().toLowerCase();
const apiKey = (process.env.RESEND_API_KEY ?? "").trim();
const runnable = recipient.length > 0 && apiKey.length > 0 && !process.env.CI;

if (!runnable) {
  console.log(
    "[email-live] skipped: set EMAIL_TEST_RECIPIENT and RESEND_API_KEY in .env.test.local, and never run in CI."
  );
}

afterAll(async () => {
  await stopTestDb();
});

/**
 * Live smoke test: sends a REAL welcome email through the real path
 * (enqueue -> drainOutbox -> Resend) when EMAIL_DRY_RUN is false. Each live
 * run uses 1 of the 100 daily free-plan emails. With EMAIL_DRY_RUN=true it
 * exercises the same path without sending. Never runs under `npm test` or CI.
 */
describe.skipIf(!runnable)("email live send", () => {
  it(
    "delivers the welcome template to EMAIL_TEST_RECIPIENT",
    async () => {
      await startTestDb();
      console.log(`[email-live] connected db: ${mongoose.connection.name}`);

      // Quarantine leftovers from interrupted runs. Pending rows never
      // consumed quota, so cancelling them needs no refund, and it keeps
      // this run to exactly one send.
      const quarantined = await EmailOutbox.updateMany(
        { dedupeKey: /^live-welcome:/, status: "pending" },
        { $set: { status: "cancelled", lastError: "quarantined by newer live run" } }
      );
      if (quarantined.modifiedCount > 0) {
        console.log(`[email-live] quarantined ${quarantined.modifiedCount} leftover row(s)`);
      }

      // The non-production guard must let exactly this address through.
      process.env.EMAIL_DEV_ALLOWLIST = recipient;
      resetEmailConfigForTests();
      console.log("[email-live] enqueuing welcome email");
      const dryRun = getEmailConfig().dryRun;
      console.log(`[email-live] mode: ${dryRun ? "dry-run (no mail sent)" : "LIVE (1 real email)"}`);

      // Unique per run so re-running the test sends again.
      const dedupeKey = `live-welcome:${Date.now()}`;
      const queued = await enqueue({
        type: "welcome",
        to: recipient,
        payload: { name: "Live Test" },
        dedupeKey,
      });
      expect(queued.status).toBe("queued");
      console.log("[email-live] enqueued, draining outbox");

      const rendered = await renderEmail("welcome", { name: "Live Test" });
      expect(rendered.subject.length).toBeGreaterThan(0);
      expect(rendered.html.length).toBeGreaterThan(100);
      expect(rendered.text.length).toBeGreaterThan(20);

      const summary = await drainOutbox({ limit: 5 });
      console.log(`[email-live] drain finished: ${JSON.stringify(summary)}`);
      // Scoped to our own row: other runs' already-sent rows are never
      // claimed, and pending leftovers were quarantined above.
      expect(summary.sent).toBeGreaterThanOrEqual(1);

      try {
        const row = await EmailOutbox.findOne({ dedupeKey }).lean();
        expect(row?.status).toBe("sent");
        if (dryRun) {
          expect(row?.resendId ?? "").toContain("dry-run");
          console.log("[email-live] dry-run recorded, no mail sent, no quota consumed");
        } else {
          expect(row?.resendId ?? "").not.toContain("dry-run");
          expect(String(row?.resendId ?? "").length).toBeGreaterThan(0);
          console.log(`[email-live] delivered to ${recipient}, resend id ${row?.resendId}`);
        }

        // Clean up the test row. Quota is only released on the live path,
        // because dry runs never consume quota.
        const usage = await getQuotaUsage();
        await EmailOutbox.deleteOne({ dedupeKey });
        if (!dryRun) {
          await releaseQuotaUnits(usage.dayKey, usage.monthKey);
        }
      } finally {
        await stopTestDb();
      }
    },
    120_000
  );
});
