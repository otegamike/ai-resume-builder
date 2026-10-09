import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import EmailQuota from "@/models/EmailQuota";
import EmailSuppression from "@/models/EmailSuppression";
import { getEmailConfig } from "@/lib/email/config";
import { drainOutbox } from "@/lib/email/drain";

void EmailOutbox;
void EmailQuota;
void EmailSuppression;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Safety net for the email outbox. Most mail leaves within seconds via the
 * post-response drain; this picks up anything pending, failed-and-retryable,
 * or scheduled (reminders). Hobby cron runs at most once per day, so
 * correctness never depends on high-frequency runs.
 */
export async function GET(req: Request) {
  const config = getEmailConfig();
  const authHeader = req.headers.get("authorization") ?? "";

  if (!config.cronSecret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${config.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const summary = await drainOutbox({ limit: 50 });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Email drain failed:", error);
    return NextResponse.json({ error: "Drain failed" }, { status: 500 });
  }
}
