import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import Activity from "@/models/Activity";
import { getAuthenticatedUser } from "@/lib/authUser";

void Notification;
void Activity;

export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isReadParam = searchParams.get("isRead");
    const type = searchParams.get("type");
    const cursor = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 50);

    await dbConnect();

    const query: Record<string, unknown> = {
      recipientId: authUser.userObjectId,
    };

    if (isReadParam === "true") query.isRead = true;
    if (isReadParam === "false") query.isRead = false;
    if (type) query.type = type;
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query.createdAt = { $lt: cursorDate };
      }
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = notifications.length > limit;
    const sliced = hasMore ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasMore ? sliced[sliced.length - 1].createdAt.toISOString() : null;

    const data = sliced.map((n) => ({
      _id: String(n._id),
      recipientId: String(n.recipientId),
      activityId: String(n.activityId),
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return NextResponse.json({ notifications: data, nextCursor, hasMore });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
