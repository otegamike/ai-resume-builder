import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { parseJobAdFromText, extractTextFromJobImage } from "@/lib/ai";
import { fileToDataUrl } from "@/lib/resumeImprover";

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
    const jobMode = formData.get("jobMode") as string;

    let jobText = "";

    if (jobMode === "text") {
      jobText = ((formData.get("jobText") as string) || "").trim();
      if (!jobText) {
        return NextResponse.json({ error: "Job description text is empty" }, { status: 400 });
      }
    } else if (jobMode === "image") {
      const jobImageFile = formData.get("jobImage") as File | null;
      if (!jobImageFile) {
        return NextResponse.json({ error: "No job image uploaded" }, { status: 400 });
      }
      if (!jobImageFile.type.startsWith("image/")) {
        return NextResponse.json({ error: "Job file must be an image" }, { status: 400 });
      }
      const dataUrl = await fileToDataUrl(jobImageFile);
      jobText = await extractTextFromJobImage(dataUrl);
      if (!jobText.trim()) {
        return NextResponse.json({ error: "Could not extract text from image" }, { status: 422 });
      }
    } else {
      return NextResponse.json({ error: "Invalid jobMode" }, { status: 400 });
    }

    const parsed = await parseJobAdFromText(jobText);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Job parse error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse job ad";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
