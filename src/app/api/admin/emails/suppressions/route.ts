import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import EmailSuppression from "@/models/EmailSuppression";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void EmailSuppression;

export const GET = withApiHandler(
  async (request: Request) => {
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
      return handleApiError(error, { route: "/api/admin/emails/suppressions", flow: "admin" });
    }
  },
  { route: "/api/admin/emails/suppressions", flow: "admin" }
);

export const DELETE = withApiHandler(
  async (request: Request) => {
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
      return handleApiError(error, { route: "/api/admin/emails/suppressions", flow: "admin" });
    }
  },
  { route: "/api/admin/emails/suppressions", flow: "admin" }
);
