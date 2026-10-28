import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const GET = withApiHandler(
  async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const result = await User.aggregate([
      { $unwind: "$primaryGoal" },
      { $group: { _id: "$primaryGoal", count: { $sum: 1 } } },
      { $project: { _id: 0, goal: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    return NextResponse.json({ goals: result });
  },
  { route: "/api/admin/stats/primary-goals", flow: "admin" }
);
