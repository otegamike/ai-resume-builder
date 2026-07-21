import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import AiUsageEvent from "@/models/AiUsageEvent";
import { daysAgo, startOfToday } from "@/utils/date";
import type { AiUsageDaily, AiUsageStats } from "@/types/Stats";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const cutoff = daysAgo(30);

  const [todayByFeature, dailyRaw] = await Promise.all([
    AiUsageEvent.aggregate([
      { $match: { createdAt: { $gte: startOfToday() } } },
      {
        $group: {
          _id: "$feature",
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
        },
      },
    ]),
    AiUsageEvent.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            feature: "$feature",
          },
          requests: { $sum: 1 },
          tokens: { $sum: "$totalTokens" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]),
  ]);

  const truncatedCount = await AiUsageEvent.countDocuments({
    createdAt: { $gte: startOfToday() },
    truncated: true,
  });

  const byFeature = todayByFeature.map((f) => ({
    feature: f._id,
    requests: f.requests,
    tokens: f.tokens,
  }));

  const totalRequests = byFeature.reduce((s, f) => s + f.requests, 0);
  const totalTokens = byFeature.reduce((s, f) => s + f.tokens, 0);

  const dailyMap = new Map<string, { totalRequests: number; totalTokens: number; byFeature: Map<string, number> }>();

  for (const r of dailyRaw) {
    const date = r._id.date;
    const feature = r._id.feature;
    const requests = r.requests;
    const tokens = r.tokens;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, { totalRequests: 0, totalTokens: 0, byFeature: new Map() });
    }
    const day = dailyMap.get(date)!;
    day.totalRequests += requests;
    day.totalTokens += tokens;
    day.byFeature.set(feature, (day.byFeature.get(feature) || 0) + requests);
  }

  const daily: AiUsageDaily[] = [];
  for (const [date, day] of dailyMap) {
    daily.push({
      date,
      totalRequests: day.totalRequests,
      totalTokens: day.totalTokens,
      byFeature: Array.from(day.byFeature.entries()).map(([feature, requests]) => ({
        feature,
        requests,
      })),
    });
  }

  const result: AiUsageStats = {
    today: {
      totalRequests,
      totalTokens,
      truncatedCount,
      byFeature,
    },
    daily,
  };

  return NextResponse.json(result);
}
