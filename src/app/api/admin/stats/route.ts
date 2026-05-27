import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Resume from "@/models/Resume";
import SiteVisit from "@/models/SiteVisit";
import { daysAgo, startOfToday } from "@/utils/date";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const [
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    totalResumes,
    resumesToday,
    resumesThisWeek,
    resumesThisMonth,
    visitsToday,
    visitsThisWeek,
    visitsThisMonth,
    activeUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startOfToday() } }),
    User.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    User.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    Resume.countDocuments(),
    Resume.countDocuments({ createdAt: { $gte: startOfToday() } }),
    Resume.countDocuments({ createdAt: { $gte: daysAgo(7) } }),
    Resume.countDocuments({ createdAt: { $gte: daysAgo(30) } }),
    SiteVisit.countDocuments({ timestamp: { $gte: startOfToday() } }),
    SiteVisit.countDocuments({ timestamp: { $gte: daysAgo(7) } }),
    SiteVisit.countDocuments({ timestamp: { $gte: daysAgo(30) } }),
    Resume.distinct("user", { updatedAt: { $gte: daysAgo(30) } }),
  ]);

  return NextResponse.json({
    totalUsers,
    newUsersToday,
    newUsersThisWeek,
    newUsersThisMonth,
    totalResumes,
    resumesToday,
    resumesThisWeek,
    resumesThisMonth,
    visitsToday,
    visitsThisWeek,
    visitsThisMonth,
    activeUsers: activeUsers.filter(Boolean).length,
  });
}
