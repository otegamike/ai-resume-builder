"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import styles from "./NotificationBell.module.css";

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

export default function NotificationBell() {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchUnreadCount();
  }, [isSignedIn, fetchUnreadCount]);

  useEffect(() => {
    if (!isSignedIn) return;
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
  }, [isSignedIn, fetchUnreadCount]);

  useEffect(() => {
    if (!open || !isSignedIn) return;
    fetchNotifications({ reset: true });
    fetchUnreadCount();
  }, [open, isSignedIn, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!isSignedIn) return null;

  const recent = notifications.slice(0, 8);

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        className={styles.bellButton}
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className={styles.bellIcon} size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>Notifications</h3>
            {unreadCount > 0 && (
              <button className={styles.markAllButton} onClick={() => markAllRead()}>
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {isLoading && recent.length === 0 ? (
              <div className={styles.loadingRow}>
                <Loader2 className={styles.spinner} size={18} />
                <span>Loading...</span>
              </div>
            ) : recent.length === 0 ? (
              <div className={styles.emptyState}>
                <Bell size={24} className={styles.emptyIcon} />
                <p>No notifications yet</p>
                <span>We&apos;ll notify you when something important happens.</span>
              </div>
            ) : (
              recent.map((n) => (
                <div
                  key={n._id}
                  className={`${styles.item} ${!n.isRead ? styles.unread : ""}`}
                  onClick={() => {
                    if (!n.isRead) markAsRead(n._id);
                  }}
                >
                  <div className={styles.itemDot} data-read={String(n.isRead)} />
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>{n.title}</p>
                    {n.body && <p className={styles.itemBody}>{n.body}</p>}
                    <span className={styles.itemTime}>{formatRelativeTime(n.createdAt)}</span>
                  </div>
                  {n.link && (
                    <Link
                      href={n.link}
                      className={styles.itemLink}
                      onClick={() => setOpen(false)}
                    >
                      View
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={styles.dropdownFooter}>
            <Link href="/dashboard/notifications" className={styles.viewAllLink} onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
