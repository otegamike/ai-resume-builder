import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Resume from "@/models/Resume";
import SiteVisit from "@/models/SiteVisit";

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface TimelineEntry {
  date: string;
  count: number;
}

function buildDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(formatDate(daysAgo(i)));
  }
  return dates;
}

function mergeWithRange(
  range: string[],
  data: { _id: string; count: number }[]
): TimelineEntry[] {
  const map = new Map(data.map((d) => [d._id, d.count]));
  return range.map((date) => ({
    date,
    count: map.get(date) ?? 0,
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const range = buildDateRange(30);
  const cutoff = daysAgo(30);

  const [visitsRaw, signupsRaw, resumesRaw] = await Promise.all([
    SiteVisit.aggregate([
      { $match: { timestamp: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 },
        },
      },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    Resume.aggregate([
      { $match: { createdAt: { $gte: cutoff } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return NextResponse.json({
    visits: mergeWithRange(range, visitsRaw),
    signups: mergeWithRange(range, signupsRaw),
    resumes: mergeWithRange(range, resumesRaw),
  });
}
