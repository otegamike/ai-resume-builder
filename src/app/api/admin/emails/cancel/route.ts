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

    if (row.status !== "pending" && row.status !== "sending") {
      return NextResponse.json(
        { error: `Only pending or sending emails can be cancelled (current: ${row.status})` },
        { status: 400 }
      );
    }

    row.status = "cancelled";
    row.lockedAt = null;
    await row.save();

    return NextResponse.json({ success: true, _id: String(row._id), status: row.status });
  } catch (error) {
    console.error("Error cancelling admin email:", error);
    return NextResponse.json({ error: "Failed to cancel email" }, { status: 500 });
  }
}
