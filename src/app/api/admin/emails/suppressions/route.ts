import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailSuppression from "@/models/EmailSuppression";

void EmailSuppression;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 100);

    await dbConnect();
    const rows = await EmailSuppression.find({}).sort({ createdAt: -1 }).limit(limit);

    const data = rows.map((row) => ({
      _id: String(row._id),
      email: row.email,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    return NextResponse.json({ suppressions: data });
  } catch (error) {
    console.error("Error fetching admin suppressions:", error);
    return NextResponse.json({ error: "Failed to fetch suppressions" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email query param is required" }, { status: 400 });
    }

    await dbConnect();
    const result = await EmailSuppression.deleteOne({ email });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Suppression not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Error removing admin suppression:", error);
    return NextResponse.json({ error: "Failed to remove suppression" }, { status: 500 });
  }
}
