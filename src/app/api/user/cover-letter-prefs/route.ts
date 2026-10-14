import "server-only";

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/authUser";
import User from "@/models/User";

void User;

export const DEFAULT_COVER_LETTER_INTRO = "Dear Hiring Manager,";
const MAX_LENGTH = 2000;

function normalize(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  return value.slice(0, MAX_LENGTH);
}

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
    const user = await User.findById(authUser.userObjectId).select(
      "coverLetterIntro coverLetterOutro"
    );
    return NextResponse.json({
      intro: user?.coverLetterIntro ?? DEFAULT_COVER_LETTER_INTRO,
      outro: user?.coverLetterOutro ?? "",
    });
  } catch (error) {
    console.error("Error fetching cover letter prefs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { intro?: unknown; outro?: unknown };
    const intro = normalize(body.intro, DEFAULT_COVER_LETTER_INTRO).trim();
    const outro = normalize(body.outro, "").trim();

    await dbConnect();
    const updated = await User.findByIdAndUpdate(
      authUser.userObjectId,
      {
        $set: {
          coverLetterIntro: intro || DEFAULT_COVER_LETTER_INTRO,
          coverLetterOutro: outro,
        },
      },
      { returnDocument: "after" }
    ).select("coverLetterIntro coverLetterOutro");

    return NextResponse.json({
      intro: updated?.coverLetterIntro ?? DEFAULT_COVER_LETTER_INTRO,
      outro: updated?.coverLetterOutro ?? "",
    });
  } catch (error) {
    console.error("Error updating cover letter prefs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
