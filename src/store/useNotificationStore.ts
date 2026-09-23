import { create } from "zustand";
import type { Notification } from "@/types/NotificationData";
import { useAlertStore } from "./useAlertStore";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  fetchNotifications: (opts?: { cursor?: string | null; reset?: boolean; isRead?: boolean | null; type?: string | null }) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: (delta?: number) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  hasMore: true,
  nextCursor: null,

  fetchNotifications: async (opts) => {
    const reset = opts?.reset ?? !opts?.cursor;
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (opts?.cursor) params.set("cursor", opts.cursor);
      else if (get().nextCursor && !reset) params.set("cursor", get().nextCursor as string);
      if (opts?.isRead === true) params.set("isRead", "true");
      if (opts?.isRead === false) params.set("isRead", "false");
      if (opts?.type) params.set("type", opts.type as string);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const data = await res.json();
      const list: Notification[] = data.notifications || [];
      if (reset) {
        set({
          notifications: list,
          hasMore: data.hasMore ?? false,
          nextCursor: data.nextCursor ?? null,
          isLoading: false,
        });
      } else {
        set((s) => ({
          notifications: [...s.notifications, ...list],
          hasMore: data.hasMore ?? false,
          nextCursor: data.nextCursor ?? null,
          isLoading: false,
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch notifications";
      set({ error: message, isLoading: false });
      useAlertStore.getState().addAlert("error", message);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      set({ unreadCount: data.count ?? 0 });
    } catch {}
  },

  setUnreadCount: (count: number) => set({ unreadCount: Math.max(0, count) }),

  incrementUnreadCount: (delta = 1) =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount + delta) })),

  addNotification: (notification: Notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: notification.isRead ? s.unreadCount : s.unreadCount + 1,
    })),

  markAsRead: async (id: string) => {
    const previous = get().notifications;
    set((s) => ({
      notifications: s.notifications.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
      unreadCount: Math.max(0, s.unreadCount - (previous.find((n) => n._id === id && !n.isRead) ? 1 : 0)),
    }));
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark as read");
    } catch (err) {
      set({ notifications: previous, unreadCount: previous.filter((n) => !n.isRead).length });
      useAlertStore.getState().addAlert("error", "Failed to mark notification as read");
    }
  },

  markAllRead: async () => {
    const previous = get().notifications;
    const previousCount = get().unreadCount;
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() })),
      unreadCount: 0,
    }));
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all as read");
    } catch (err) {
      set({ notifications: previous, unreadCount: previousCount });
      useAlertStore.getState().addAlert("error", "Failed to mark all as read");
    }
  },
}));
