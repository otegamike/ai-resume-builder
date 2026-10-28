import { NextResponse } from "next/server";
import { getTemplateDefinition, isTemplateId } from "@/lib/templateServer";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

export const GET = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    if (!isTemplateId(id)) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    try {
      const template = await getTemplateDefinition(id);
      return NextResponse.json(template);
    } catch (error) {
      return handleApiError(error, { route: "/api/templates/[id]", flow: "templates" });
    }
  },
  { route: "/api/templates/[id]", flow: "templates" }
);
