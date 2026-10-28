import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void Notification;

export const PATCH = withApiHandler(
  async () => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await dbConnect();

      const result = await Notification.updateMany(
        { recipientId: authUser.userObjectId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      return NextResponse.json({ success: true, modified: result.modifiedCount });
    } catch (error) {
      return handleApiError(error, { route: "/api/notifications/read-all", flow: "notifications" });
    }
  },
  { route: "/api/notifications/read-all", flow: "notifications" }
);
