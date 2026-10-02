import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/authUser";
import UploadedResume from "@/models/UploadedResume";

void UploadedResume;

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid resume id" }, { status: 400 });
  }

  await dbConnect();
  const deleted = await UploadedResume.findOneAndDelete({
    _id: id,
    userId: authUser.userObjectId,
  });

  if (!deleted) {
    return NextResponse.json({ error: "Uploaded resume not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
