import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailOutbox from "@/models/EmailOutbox";

void EmailOutbox;

export async function POST(request: Request) {
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

    return NextResponse.json({ success: true, _id: String(row._id), status: row.status });
  } catch (error) {
    console.error("Error retrying admin email:", error);
    return NextResponse.json({ error: "Failed to retry email" }, { status: 500 });
  }
}
