import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Activity from "@/models/Activity";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void Activity;

export const GET = withApiHandler(
  async (request: Request) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const type = searchParams.get("type");
      const entityType = searchParams.get("entityType");
      const cursor = searchParams.get("cursor");
      const limitParam = searchParams.get("limit");
      const limit = Math.min(Math.max(parseInt(limitParam || "20", 10) || 20, 1), 50);

      await dbConnect();

      const query: Record<string, unknown> = {
        actorId: authUser.userObjectId,
      };

      if (type) query.type = type;
      if (entityType) query.entityType = entityType;
      if (cursor) {
        const cursorDate = new Date(cursor);
        if (!isNaN(cursorDate.getTime())) {
          query.createdAt = { $lt: cursorDate };
        }
      }

      const activities = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1);

      const hasMore = activities.length > limit;
      const sliced = hasMore ? activities.slice(0, limit) : activities;
      const nextCursor = hasMore ? sliced[sliced.length - 1].createdAt.toISOString() : null;

      const data = sliced.map((a) => ({
        _id: String(a._id),
        actorId: String(a.actorId),
        actorEmail: a.actorEmail,
        actorName: a.actorName,
        type: a.type,
        title: a.title,
        detail: a.detail,
        entityType: a.entityType,
        entityId: a.entityId ? String(a.entityId) : undefined,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));

      return NextResponse.json({ activities: data, nextCursor, hasMore });
    } catch (error) {
      return handleApiError(error, { route: "/api/activities", flow: "activities" });
    }
  },
  { route: "/api/activities", flow: "activities" }
);
