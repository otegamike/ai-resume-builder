import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";
import { sendRowNow } from "@/lib/email/drain";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void EmailOutbox;

export const POST = withApiHandler(
  async (request: Request) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body = (await request.json().catch(() => null)) as { outboxId?: unknown } | null;
      const outboxId = typeof body?.outboxId === "string" ? body.outboxId : "";
      if (!outboxId || !Types.ObjectId.isValid(outboxId)) {
        return NextResponse.json({ error: "Valid outboxId is required" }, { status: 400 });
      }

      await dbConnect();
      const row = await EmailOutbox.findById(outboxId);
      if (!row) {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }

      if (row.status !== "failed" && row.status !== "sending" && row.status !== "pending") {
        return NextResponse.json(
          { error: `Only failed, sending, or pending emails can be retried (current: ${row.status})` },
          { status: 400 }
        );
      }

      row.status = "pending";
      row.sendAfter = new Date();
      row.lockedAt = null;
      await row.save();

      // Synchronous priority attempt: return whether it actually sent instead
      // of leaving the row for the next cron run.
      const fresh = await EmailOutbox.findById(outboxId);
      if (!fresh) {
        return NextResponse.json({ error: "Email not found" }, { status: 404 });
      }
      const outcome = await sendRowNow(fresh);
      console.log(`[email] admin-retry status=${outcome.status}${outcome.reason ? ` reason=${outcome.reason}` : ""}`);
      return NextResponse.json({
        success: outcome.status === "sent" || outcome.status === "queued",
        _id: String(row._id),
        emailStatus: outcome.status,
        resendId: outcome.resendId,
        reason: outcome.reason,
      });
    } catch (error) {
      return handleApiError(error, { route: "/api/admin/emails/retry", flow: "admin" });
    }
  },
  { route: "/api/admin/emails/retry", flow: "admin" }
);
