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
    const { name, jobTitle, location, phone, primaryGoal, targetField, industry, targetRole, hasExistingResume } = body;
    const resolvedIndustry = typeof industry === "string" ? industry : "";
    const resolvedTargetRole = typeof targetRole === "string" ? targetRole : (typeof targetField === "string" ? targetField : "");

    const update: Record<string, unknown> = {
      jobTitle: jobTitle ?? "",
      location: location ?? "",
      phone: phone ?? "",
      primaryGoal: Array.isArray(primaryGoal) ? primaryGoal : [],
      targetField: resolvedTargetRole || resolvedIndustry || targetField || "",
      industry: resolvedIndustry,
      targetRole: resolvedTargetRole,
      hasExistingResume: !!hasExistingResume,
      hasCompletedOnboarding: true,
    };
    if (typeof name === "string" && name.trim().length > 0) {
      update.name = name.trim();
    }

    await User.findByIdAndUpdate(authUser.userObjectId, {
      $set: update,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Onboarding save error:", error);
    return NextResponse.json({ error: "Failed to save onboarding data" }, { status: 500 });
  }
}
