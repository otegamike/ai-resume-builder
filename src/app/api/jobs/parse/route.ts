import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { parseJobAdFromText } from "@/lib/ai";
import {
  InputExtractionError,
  resolveJobParseInput,
} from "@/lib/inputExtraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = (authUser as unknown as { session?: { user?: { isAdmin?: boolean } } }).session?.user;
    const userObj = authUser.userObjectId
      ? await (await import("@/models/User")).default.findById(authUser.userObjectId).select("isAdmin")
      : null;
    const isAdmin = Boolean(sessionUser?.isAdmin || userObj?.isAdmin);

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const jobText = await resolveJobParseInput(formData);

    const parsed = await parseJobAdFromText(jobText);

    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof InputExtractionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Job parse error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse job ad";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
