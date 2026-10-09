import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import EmailSuppression, { type SuppressionReason } from "@/models/EmailSuppression";
import EmailEvent from "@/models/EmailEvent";
import { getEmailConfig } from "@/lib/email/config";
import { verifySvixSignature } from "@/lib/email/webhook";

void EmailOutbox;
void EmailSuppression;
void EmailEvent;

export const dynamic = "force-dynamic";

interface ResendWebhookBody {
  type?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    subject?: string;
  };
}

function recipientsOf(data: ResendWebhookBody["data"]): string[] {
  if (!data) return [];
  const to = data.to;
  const list = Array.isArray(to) ? to : [to];
  return list
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.includes("@"));
}

export async function POST(req: Request) {
  const config = getEmailConfig();
  const rawBody = await req.text();

  const verified = verifySvixSignature(
    rawBody,
    {
      svixId: req.headers.get("svix-id") ?? "",
      svixTimestamp: req.headers.get("svix-timestamp") ?? "",
      svixSignature: req.headers.get("svix-signature") ?? "",
    },
    config.resendWebhookSecret
  );
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: ResendWebhookBody;
  try {
    body = JSON.parse(rawBody) as ResendWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = String(body.type ?? "");
  const emailId = String(body.data?.email_id ?? "");
  if (!eventType) return NextResponse.json({ received: true });

  try {
    await dbConnect();

    // Idempotent handling: same Resend event retried has the same type + id.
    const seen = emailId
      ? await EmailEvent.findOne({ resendId: emailId, type: eventType }).select("_id").lean()
      : null;
    if (seen) return NextResponse.json({ received: true, deduped: true });

    if (eventType === "email.bounced" || eventType === "email.complained") {
      const reason: SuppressionReason = eventType === "email.bounced" ? "bounce" : "complaint";
      const recipients = recipientsOf(body.data);
      for (const email of recipients) {
        try {
          await EmailSuppression.updateOne(
            { email },
            { $setOnInsert: { email, reason } },
            { upsert: true }
          );
        } catch {
          // Unique race on concurrent deliveries; safe to ignore.
        }
      }
      if (emailId) {
        await EmailOutbox.updateOne(
          { resendId: emailId },
          { $set: { lastError: `webhook:${eventType}` } }
        );
      }
    }

    if (emailId) {
      await EmailEvent.create({ resendId: emailId, type: eventType, at: new Date(), raw: body });
    }
  } catch (error) {
    console.error("Resend webhook handling failed:", error);
    // Return 2xx anyway so Resend stops retrying a poison event; the failure
    // is logged and the outbox row keeps its last known state.
  }

  return NextResponse.json({ received: true });
}
