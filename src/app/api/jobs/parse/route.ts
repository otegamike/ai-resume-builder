import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import { aiContextFromAuthUser, parseJobAdFromText } from "@/lib/ai";
import { resolveJobParseInput } from "@/lib/inputExtraction";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

export const POST = withApiHandler(
  async (request: Request) => {
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
      const ctx = aiContextFromAuthUser(authUser);
      const jobText = await resolveJobParseInput(formData, ctx);

      const parsed = await parseJobAdFromText(jobText, ctx);

      return NextResponse.json(parsed);
    } catch (error) {
      return handleApiError(error, { route: "/api/jobs/parse", flow: "jobs" });
    }
  },
  { route: "/api/jobs/parse", flow: "jobs" }
);
