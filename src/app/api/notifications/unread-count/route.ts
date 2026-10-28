import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void Notification;

export const GET = withApiHandler(
  async () => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      await dbConnect();

      const count = await Notification.countDocuments({
        recipientId: authUser.userObjectId,
        isRead: false,
      });

      return NextResponse.json({ count });
    } catch (error) {
      return handleApiError(error, { route: "/api/notifications/unread-count", flow: "notifications" });
    }
  },
  { route: "/api/notifications/unread-count", flow: "notifications" }
);
