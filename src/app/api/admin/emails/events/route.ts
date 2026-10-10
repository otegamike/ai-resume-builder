import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailEvent from "@/models/EmailEvent";

void EmailEvent;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "30", 10) || 30, 1), 100);

    await dbConnect();
    const events = await EmailEvent.find({}).sort({ at: -1 }).limit(limit);

    const data = events.map((event) => ({
      _id: String(event._id),
      resendId: event.resendId ?? null,
      type: event.type,
      at: event.at.toISOString(),
    }));

    return NextResponse.json({ events: data });
  } catch (error) {
    console.error("Error fetching admin email events:", error);
    return NextResponse.json({ error: "Failed to fetch email events" }, { status: 500 });
  }
}
