import "server-only";

import { Types } from "mongoose";
import dbConnect from "@/lib/db";
import Activity from "@/models/Activity";
import Notification from "@/models/Notification";
import type { ActivityType, ActivityEntityType } from "@/types/ActivityData";
import type { NotificationType } from "@/types/NotificationData";

void Activity;
void Notification;

export interface PerRecipientNotification {
  recipientId: Types.ObjectId;
  type?: NotificationType;
  title?: string;
  body?: string;
  link?: string;
}

export interface RecordActivityParams {
  actorId: Types.ObjectId;
  actorEmail?: string;
  actorName?: string;
  type: ActivityType;
  title: string;
  detail?: string;
  entityType?: ActivityEntityType;
  entityId?: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
  notifyRecipientIds?: Types.ObjectId[];
  notificationType?: NotificationType;
  notificationLink?: string;
  notificationBody?: string;
  perRecipientNotifications?: PerRecipientNotification[];
}

export async function recordActivity(params: RecordActivityParams) {
  const {
    actorId,
    actorEmail,
    actorName,
    type,
    title,
    detail,
    entityType,
    entityId,
    metadata,
    notifyRecipientIds,
    notificationType,
    notificationLink,
    notificationBody,
    perRecipientNotifications,
  } = params;

  await dbConnect();

  let resolvedEntityId: Types.ObjectId | undefined;
  if (entityId) {
    if (entityId instanceof Types.ObjectId) {
      resolvedEntityId = entityId;
    } else if (Types.ObjectId.isValid(entityId)) {
      resolvedEntityId = new Types.ObjectId(entityId);
    }
  }

  const activity = await Activity.create({
    actorId,
    actorEmail: actorEmail || "",
    actorName: actorName || "",
    type,
    title,
    detail: detail || "",
    entityType,
    entityId: resolvedEntityId,
    metadata: metadata || {},
  });

  if (perRecipientNotifications && perRecipientNotifications.length > 0) {
    const seen = new Set<string>();
    const docs: Array<{
      recipientId: Types.ObjectId;
      activityId: Types.ObjectId;
      type: NotificationType;
      title: string;
      body: string;
      link: string;
      isRead: boolean;
      readAt: null;
    }> = [];
    for (const n of perRecipientNotifications) {
      const key = String(n.recipientId);
      if (seen.has(key)) continue;
      seen.add(key);
      const t = (n.type || notificationType) as NotificationType | undefined;
      if (!t) continue;
      docs.push({
        recipientId: new Types.ObjectId(key),
        activityId: activity._id,
        type: t,
        title: n.title || title,
        body: n.body || notificationBody || detail || "",
        link: n.link || notificationLink || "",
        isRead: false,
        readAt: null,
      });
    }
    if (docs.length > 0) {
      await Notification.insertMany(docs);
    }
  } else if (notifyRecipientIds && notifyRecipientIds.length > 0 && notificationType) {
    const uniqueIds = Array.from(
      new Set(notifyRecipientIds.map((id) => String(id)))
    ).map((id) => new Types.ObjectId(id));

    if (uniqueIds.length > 0) {
      const notifications = uniqueIds.map((recipientId) => ({
        recipientId,
        activityId: activity._id,
        type: notificationType,
        title,
        body: notificationBody || detail || "",
        link: notificationLink || "",
        isRead: false,
        readAt: null,
      }));

      await Notification.insertMany(notifications);
    }
  }

  return activity;
}

export async function getUnreadCount(recipientId: Types.ObjectId) {
  await dbConnect();
  const count = await Notification.countDocuments({
    recipientId,
    isRead: false,
  });
  return count;
}
