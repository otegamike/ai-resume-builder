import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { getCredits } from "@/lib/creditUtils";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credits = await getCredits(String(authUser.userObjectId));
    return NextResponse.json({ credits });
  } catch (error) {
    console.error("Failed to fetch credits:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}
