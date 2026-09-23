"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck, Loader2, ExternalLink } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import styles from "./page.module.css";

const NOTIFICATION_TYPES = [
  { value: "", label: "All types" },
  { value: "application_submitted", label: "Application submitted" },
  { value: "application_status_changed", label: "Status changed" },
  { value: "application_viewed_by_employer", label: "Viewed by employer" },
  { value: "application_withdrawn", label: "Withdrawn" },
  { value: "job_status_changed", label: "Job status" },
];

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [filterRead, setFilterRead] = useState<"all" | "unread" | "read">("all");
  const [filterType, setFilterType] = useState("");

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const nextCursor = useNotificationStore((s) => s.nextCursor);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.push("/");
      return;
    }
    fetchUnreadCount();
  }, [status, router, fetchUnreadCount]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const isRead = filterRead === "all" ? null : filterRead === "unread" ? false : true;
    fetchNotifications({ reset: true, isRead, type: filterType || null });
  }, [filterRead, filterType, status, fetchNotifications]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const onFocus = () => fetchUnreadCount();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchUnreadCount();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [status, fetchUnreadCount]);

  const handleLoadMore = () => {
    if (!nextCursor) return;
    const isRead = filterRead === "all" ? null : filterRead === "unread" ? false : true;
    fetchNotifications({ cursor: nextCursor, isRead, type: filterType || null });
  };

  if (status === "loading") {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingIcon} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            Notifications
          </h1>
          <p className={styles.subtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAllButton} onClick={() => markAllRead()}>
            <CheckCheck size={16} />
            Mark all as read
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <button
            className={`${styles.filterPill} ${filterRead === "all" ? styles.active : ""}`}
            onClick={() => setFilterRead("all")}
          >
            All
          </button>
          <button
            className={`${styles.filterPill} ${filterRead === "unread" ? styles.active : ""}`}
            onClick={() => setFilterRead("unread")}
          >
            Unread
          </button>
          <button
            className={`${styles.filterPill} ${filterRead === "read" ? styles.active : ""}`}
            onClick={() => setFilterRead("read")}
          >
            Read
          </button>
        </div>
        <select
          className={styles.typeSelect}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          {NOTIFICATION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.list}>
        {notifications.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <Bell size={32} className={styles.emptyIcon} />
            <p>No notifications</p>
            <span>When you apply to jobs or your application status changes, you will see it here.</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`${styles.item} ${!n.isRead ? styles.unread : ""}`}
            >
              <div className={styles.itemDot} data-read={String(n.isRead)} />
              <div className={styles.itemContent}>
                <p className={styles.itemTitle}>{n.title}</p>
                {n.body && <p className={styles.itemBody}>{n.body}</p>}
                <span className={styles.itemTime}>{formatRelativeTime(n.createdAt)}</span>
              </div>
              <div className={styles.itemActions}>
                {!n.isRead && (
                  <button className={styles.markReadButton} onClick={() => markAsRead(n._id)}>
                    Mark read
                  </button>
                )}
                {n.link && (
                  <Link href={n.link} className={styles.viewLink}>
                    <ExternalLink size={14} />
                    View
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {isLoading && (
        <div className={styles.loadingRow}>
          <Loader2 className={styles.spinner} size={18} />
          <span>Loading...</span>
        </div>
      )}

      {hasMore && notifications.length > 0 && !isLoading && (
        <button className={styles.loadMoreButton} onClick={handleLoadMore}>
          Load more
        </button>
      )}
    </div>
  );
}
