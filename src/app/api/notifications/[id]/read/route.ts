import { NextResponse } from "next/server";
import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import Notification from "@/models/Notification";
import { getAuthenticatedUser } from "@/lib/authUser";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

void Notification;

export const PATCH = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { id } = await params;
      if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }

      await dbConnect();

      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipientId: authUser.userObjectId },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      );

      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        notification: {
          _id: String(notification._id),
          isRead: notification.isRead,
          readAt: notification.readAt ? notification.readAt.toISOString() : null,
        },
      });
    } catch (error) {
      return handleApiError(error, { route: "/api/notifications/[id]/read", flow: "notifications" });
    }
  },
  { route: "/api/notifications/[id]/read", flow: "notifications" }
);
