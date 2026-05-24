import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SiteVisit from "@/models/SiteVisit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const path = body?.path;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    await dbConnect();

    await SiteVisit.create({
      path,
      userId: session?.user?.id || undefined,
      timestamp: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
