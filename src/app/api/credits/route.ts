import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { getCredits } from "@/lib/creditUtils";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async () => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const credits = await getCredits(String(authUser.userObjectId));
      return NextResponse.json({ credits });
    } catch (error) {
      return handleApiError(error, { route: "/api/credits", flow: "credits" });
    }
  },
  { route: "/api/credits", flow: "credits" }
);
