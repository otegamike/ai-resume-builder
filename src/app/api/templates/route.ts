import { NextResponse } from "next/server";
import { getAllTemplateDefinitions } from "@/lib/templateServer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const templates = await getAllTemplateDefinitions();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Failed to load templates:", error);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}
