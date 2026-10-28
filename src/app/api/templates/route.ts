import { NextResponse } from "next/server";
import { getAllTemplateDefinitions } from "@/lib/templateServer";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

export const GET = withApiHandler(
  async () => {
    try {
      const templates = await getAllTemplateDefinitions();
      return NextResponse.json(templates);
    } catch (error) {
      return handleApiError(error, { route: "/api/templates", flow: "templates" });
    }
  },
  { route: "/api/templates", flow: "templates" }
);
