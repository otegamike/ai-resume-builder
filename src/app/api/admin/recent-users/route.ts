import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

void User;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const users = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select("name email image createdAt primaryGoal jobTitle targetField")
    .lean();

  return NextResponse.json({ users });
}
