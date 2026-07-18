import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import User from "@/models/User";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobTitle, location, phone, primaryGoal, targetField, hasExistingResume } = body;

    await User.findByIdAndUpdate(authUser.userObjectId, {
      $set: {
        jobTitle: jobTitle ?? "",
        location: location ?? "",
        phone: phone ?? "",
        primaryGoal: Array.isArray(primaryGoal) ? primaryGoal : [],
        targetField: targetField ?? "",
        hasExistingResume: !!hasExistingResume,
        hasCompletedOnboarding: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 });
  }
}
