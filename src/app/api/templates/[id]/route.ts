import { NextResponse } from "next/server";
import { getTemplateDefinition, isTemplateId } from "@/lib/templateServer";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isTemplateId(id)) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  try {
    const template = await getTemplateDefinition(id);
    return NextResponse.json(template);
  } catch (error) {
    console.error("Failed to load template:", error);
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 });
  }
}
