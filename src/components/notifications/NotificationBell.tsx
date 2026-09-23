"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import styles from "./NotificationBell.module.css";
import formatRelativeTime from "@/utils/formatRelativeTime";

interface NotificationBellProps {
  isNotificationPanelOpen?: boolean
  toggleNotificationPanel: (notificationPanelState?: 'open' | 'close') => void
}

export default function NotificationBell({isNotificationPanelOpen: _isNotificationPanelOpen, toggleNotificationPanel }: NotificationBellProps) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchUnreadCount();
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

  if (!isSignedIn) return null;

  return (
    <div className={styles.container}>
      <button
        className={styles.bellButton}
        onClick={() => toggleNotificationPanel()}
        aria-label="Notifications"
      >
        <Bell className={styles.bellIcon} size={20} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>
    </div>
  );
}

interface NotificationPanelProps {
  isNotificationPanelOpen: boolean
  toggleNotificationPanel: (notificationPanelState?: 'open' | 'close') => void
  panelStyle: React.CSSProperties
}

export function NotificationPanel({isNotificationPanelOpen, toggleNotificationPanel, panelStyle}: NotificationPanelProps) {
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const notifications = useNotificationStore((s) => s.notifications);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchNotifications();
  }, [isSignedIn, isNotificationPanelOpen, fetchNotifications]);

  
  const recent = notifications.slice(0, 8);

  return (
    <div className={`${styles.dropdown} ${isNotificationPanelOpen ? styles.panelOpen : ''}`} style={panelStyle}>
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>Notifications</h3>
            {notifications.length > 0 && (
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
                      onClick={() => { if (!n.isRead) markAsRead(n._id); toggleNotificationPanel('close')} }
                    >
                      View
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={styles.dropdownFooter}>
            <Link href="/dashboard/notifications" className={styles.viewAllLink} onClick={() => toggleNotificationPanel('close')}>
              View all notifications
            </Link>
          </div>
        </div>
  )
}