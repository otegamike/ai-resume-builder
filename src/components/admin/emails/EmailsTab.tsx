"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  ShieldAlert,
} from "lucide-react";
import styles from "./EmailsTab.module.css";
import type {
  EmailAdminRow,
  EmailOutboxStatus,
  EmailStatsResponse,
  EmailWebhookEventRow,
  SuppressionRow,
} from "@/types/EmailAdminData";

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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

function quotaWidthClass(percent: number): string {
  const bucket = Math.min(100, Math.max(0, Math.round(percent / 10) * 10));
  switch (bucket) {
    case 10:
      return styles.quotaFillW10;
    case 20:
      return styles.quotaFillW20;
    case 30:
      return styles.quotaFillW30;
    case 40:
      return styles.quotaFillW40;
    case 50:
      return styles.quotaFillW50;
    case 60:
      return styles.quotaFillW60;
    case 70:
      return styles.quotaFillW70;
    case 80:
      return styles.quotaFillW80;
    case 90:
      return styles.quotaFillW90;
    case 100:
      return styles.quotaFillW100;
    default:
      return styles.quotaFillW0;
  }
}

function statusClass(status: EmailOutboxStatus): string {
  switch (status) {
    case "pending":
      return `${styles.statusBadge} ${styles.statusPending}`;
    case "sending":
      return `${styles.statusBadge} ${styles.statusSending}`;
    case "sent":
      return `${styles.statusBadge} ${styles.statusSent}`;
    case "failed":
      return `${styles.statusBadge} ${styles.statusFailed}`;
    case "skipped":
      return `${styles.statusBadge} ${styles.statusSkipped}`;
    case "cancelled":
      return `${styles.statusBadge} ${styles.statusCancelled}`;
    default:
      return styles.statusBadge;
  }
}

export default function EmailsTab() {
  const [emails, setEmails] = useState<EmailAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [stats, setStats] = useState<EmailStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [suppressions, setSuppressions] = useState<SuppressionRow[]>([]);
  const [suppressionsLoading, setSuppressionsLoading] = useState(true);

  const [events, setEvents] = useState<EmailWebhookEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stuckOnly, setStuckOnly] = useState(false);
  const [retryOnly, setRetryOnly] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/emails/stats");
      if (!res.ok) throw new Error("Failed to fetch");
      setStats(await res.json());
    } catch {
      // silent — list still usable without stats
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchEmails = useCallback(
    async (opts?: { cursor?: string | null; reset?: boolean }) => {
      const reset = opts?.reset ?? !opts?.cursor;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (opts?.cursor) params.set("cursor", opts.cursor);
        if (filterStatus) params.set("status", filterStatus);
        if (filterType) params.set("type", filterType);
        if (search) params.set("search", search);
        if (stuckOnly) params.set("stuckSending", "true");
        if (retryOnly) params.set("waitingForRetry", "true");

        const res = await fetch(`/api/admin/emails?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const list: EmailAdminRow[] = data.emails || [];
        if (reset) {
          setEmails(list);
        } else {
          setEmails((prev) => [...prev, ...list]);
        }
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    },
    [filterStatus, filterType, search, stuckOnly, retryOnly]
  );

  const fetchSecondary = useCallback(async () => {
    setSuppressionsLoading(true);
    setEventsLoading(true);
    try {
      const [suppRes, eventsRes] = await Promise.all([
        fetch("/api/admin/emails/suppressions?limit=50"),
        fetch("/api/admin/emails/events?limit=30"),
      ]);
      if (suppRes.ok) {
        const data = await suppRes.json();
        setSuppressions(data.suppressions || []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch {
      // silent
    } finally {
      setSuppressionsLoading(false);
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchSecondary();
  }, [fetchStats, fetchSecondary]);

  useEffect(() => {
    fetchEmails({ reset: true });
  }, [fetchEmails]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleLoadMore = () => {
    if (!nextCursor) return;
    fetchEmails({ cursor: nextCursor });
  };

  const refreshAfterAction = async () => {
    await Promise.all([fetchEmails({ reset: true }), fetchStats()]);
  };

  const handleEmailAction = async (action: "retry" | "cancel", outboxId: string) => {
    setActioningId(outboxId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/emails/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outboxId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error || `Failed to ${action} email`);
      }
      setFeedback({
        kind: "ok",
        message: action === "retry" ? "Email queued for retry." : "Email cancelled.",
      });
      await refreshAfterAction();
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : `Failed to ${action} email`,
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleUnblock = async (email: string) => {
    setActioningId(email);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/emails/suppressions?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Failed to unblock address");
      }
      setFeedback({ kind: "ok", message: `Unblocked ${email}.` });
      await Promise.all([fetchSecondary(), fetchStats()]);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to unblock address",
      });
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Mail size={22} className={styles.titleIcon} />
          Emails
        </h2>
        <p className={styles.subtitle}>
          Every queued email — pending, sending, waiting for retry, sent, failed and skipped.
          Retry or cancel stuck items, watch quota, and manage bounces.
        </p>
      </div>

      {statsLoading ? (
        <div className={styles.loadingRow}>
          <Loader2 className={styles.spinner} size={18} />
          <span>Loading stats...</span>
        </div>
      ) : stats ? (
        <>
          <div className={styles.statsGrid}>
            <EmailStatCard label="Pending" value={stats.byStatus.pending} sub="in queue now" />
            <EmailStatCard
              label="Sending"
              value={stats.byStatus.sending}
              sub={`${stats.stuckSending} stuck`}
              alert={stats.stuckSending > 0}
            />
            <EmailStatCard
              label="Waiting retry"
              value={stats.waitingForRetry}
              sub="backoff scheduled"
              alert={stats.waitingForRetry > 0}
            />
            <EmailStatCard label="Sent" value={stats.byStatus.sent} sub={`${stats.sentLast24h} last 24h`} />
            <EmailStatCard
              label="Failed"
              value={stats.byStatus.failed}
              sub={`${stats.failedLast24h} last 24h`}
              alert={stats.byStatus.failed > 0}
            />
            <EmailStatCard label="Skipped" value={stats.byStatus.skipped} sub="suppressed / opted out" />
            <EmailStatCard label="Cancelled" value={stats.byStatus.cancelled} sub="by admin" />
            <EmailStatCard label="Suppressed" value={stats.suppressionsCount} sub="blocked addresses" />
          </div>

          <div className={styles.quotaSection}>
            <div className={styles.quotaCard}>
              <div className={styles.quotaHeader}>
                <span className={styles.quotaLabel}>Daily quota</span>
                <span className={styles.quotaValue}>
                  {stats.quota.dayCount} / {stats.quota.dailyLimit}
                </span>
              </div>
              <div className={styles.quotaBar}>
                <div
                  className={`${styles.quotaFill} ${quotaWidthClass(stats.quota.dayPercent)} ${stats.quota.dayPercent >= 80 ? styles.quotaFillHigh : ""}`}
                />
              </div>
              <span className={styles.quotaHint}>
                {stats.quota.dayPercent}% used — resets midnight UTC ({stats.quota.dayKey})
              </span>
            </div>
            <div className={styles.quotaCard}>
              <div className={styles.quotaHeader}>
                <span className={styles.quotaLabel}>Monthly quota</span>
                <span className={styles.quotaValue}>
                  {stats.quota.monthCount} / {stats.quota.monthlyLimit}
                </span>
              </div>
              <div className={styles.quotaBar}>
                <div
                  className={`${styles.quotaFill} ${quotaWidthClass(stats.quota.monthPercent)} ${stats.quota.monthPercent >= 80 ? styles.quotaFillHigh : ""}`}
                />
              </div>
              <span className={styles.quotaHint}>
                {stats.quota.monthPercent}% used ({stats.quota.monthKey})
              </span>
            </div>
          </div>
        </>
      ) : null}

      <div className={styles.filters}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            className={styles.searchInput}
            placeholder="Search recipient, subject, or error message..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className={styles.searchButton}>
            <Search size={16} />
            Search
          </button>
          {search && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setSearchInput("");
                setSearch("");
              }}
            >
              Clear
            </button>
          )}
        </form>
        <div className={styles.selects}>
          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="skipped">Skipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className={styles.select}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            <option value="welcome">Welcome</option>
            <option value="application-submitted">Application submitted</option>
            <option value="application-received">Application received</option>
            <option value="application-reminder">Application reminder</option>
            <option value="job-alert">Job alert</option>
          </select>
        </div>
        <div className={styles.toggleRow}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              className={styles.toggleCheckbox}
              checked={retryOnly}
              onChange={(e) => setRetryOnly(e.target.checked)}
            />
            Waiting for retry only
          </label>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              className={styles.toggleCheckbox}
              checked={stuckOnly}
              onChange={(e) => setStuckOnly(e.target.checked)}
            />
            Stuck sending only
          </label>
        </div>
      </div>

      {feedback ? (
        <div className={feedback.kind === "ok" ? styles.actionMessage : styles.actionError}>
          {feedback.message}
        </div>
      ) : null}

      <div className={styles.metaRow}>
        <span className={styles.metaText}>
          {emails.length} email{emails.length !== 1 ? "s" : ""} loaded
        </span>
        <span className={styles.metaHint}>Sorted newest first — attempts shown as used / max.</span>
      </div>

      {emails.length === 0 && !isLoading ? (
        <div className={styles.emptyState}>
          <Mail size={32} className={styles.emptyIcon} />
          <p>No emails found</p>
          <span>Try adjusting filters or search.</span>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Queued</th>
                <th>Type</th>
                <th>To</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Last error</th>
                <th>Next retry</th>
                <th>Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <EmailRow
                  key={email._id}
                  email={email}
                  expanded={expandedId === email._id}
                  actioning={actioningId === email._id}
                  onToggle={() => setExpandedId((prev) => (prev === email._id ? null : email._id))}
                  onRetry={() => handleEmailAction("retry", email._id)}
                  onCancel={() => handleEmailAction("cancel", email._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLoading && (
        <div className={styles.loadingRow}>
          <Loader2 className={styles.spinner} size={18} />
          <span>Loading...</span>
        </div>
      )}

      {hasMore && emails.length > 0 && !isLoading && (
        <button className={styles.loadMoreButton} onClick={handleLoadMore}>
          Load more
        </button>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <ShieldAlert size={16} className={styles.titleIcon} /> Suppressions
        </h3>
        <p className={styles.sectionSubtitle}>
          Addresses blocked after a bounce or complaint. New mail to these is skipped automatically.
        </p>
        {suppressionsLoading ? (
          <div className={styles.loadingRow}>
            <Loader2 className={styles.spinner} size={16} />
            <span>Loading suppressions...</span>
          </div>
        ) : suppressions.length === 0 ? (
          <span className={styles.emptyInline}>No suppressed addresses.</span>
        ) : (
          <div className={styles.suppressionList}>
            {suppressions.map((s) => (
              <div key={s._id} className={styles.suppressionItem}>
                <div className={styles.suppressionInfo}>
                  <span className={styles.suppressionEmail}>{s.email}</span>
                  <span className={styles.suppressionReason}>
                    {s.reason} — since {formatDateTime(s.createdAt)}
                  </span>
                </div>
                <button
                  className={styles.unblockButton}
                  onClick={() => handleUnblock(s.email)}
                  disabled={actioningId === s.email}
                >
                  {actioningId === s.email ? "Working..." : "Unblock"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <AlertTriangle size={16} className={styles.titleIcon} /> Recent webhook events
        </h3>
        <p className={styles.sectionSubtitle}>
          Delivery receipts from the mail provider (bounces, complaints, opens). Kept 45 days.
        </p>
        {eventsLoading ? (
          <div className={styles.loadingRow}>
            <Loader2 className={styles.spinner} size={16} />
            <span>Loading events...</span>
          </div>
        ) : events.length === 0 ? (
          <span className={styles.emptyInline}>No webhook events yet.</span>
        ) : (
          <div className={styles.eventList}>
            {events.map((event) => (
              <div key={event._id} className={styles.eventItem}>
                <span className={styles.eventType}>{event.type}</span>
                <span className={styles.eventTime}>{formatDateTime(event.at)}</span>
                {event.resendId ? (
                  <span className={styles.eventId} title={event.resendId}>
                    {event.resendId.slice(0, 12)}…
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailStatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className={`${styles.statCard} ${alert ? styles.statCardAlert : ""}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statSub}>{sub}</span>
    </div>
  );
}

function EmailRow({
  email,
  expanded,
  actioning,
  onToggle,
  onRetry,
  onCancel,
}: {
  email: EmailAdminRow;
  expanded: boolean;
  actioning: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const canRetry = email.status === "failed" || email.status === "sending" || email.status === "pending";
  const canCancel = email.status === "pending" || email.status === "sending";
  const rowClass =
    email.status === "failed" ? styles.rowFailed : email.status === "pending" ? styles.rowPending : undefined;

  return (
    <>
      <tr className={rowClass}>
        <td className={styles.cellTime} title={formatDateTime(email.createdAt)}>
          <span className={styles.timeMain}>{formatRelativeTime(email.createdAt)}</span>
          <span className={styles.timeSub}>{formatDateTime(email.createdAt)}</span>
        </td>
        <td>
          <span className={styles.typeBadge}>{email.type}</span>
        </td>
        <td className={styles.cellTo} title={email.to}>
          <span className={styles.toMain}>{email.to}</span>
          {email.userEmail && email.userEmail !== email.to ? (
            <span className={styles.toSub}>{email.userEmail}</span>
          ) : email.userName ? (
            <span className={styles.toSub}>{email.userName}</span>
          ) : null}
        </td>
        <td className={styles.cellSubject} title={email.subject || ""}>
          {email.subject ? (
            <span className={styles.subjectText}>{email.subject}</span>
          ) : (
            <span className={styles.subjectEmpty}>not rendered yet</span>
          )}
        </td>
        <td>
          <span className={statusClass(email.status)}>{email.status}</span>
          {email.waitingForRetry ? <span className={styles.badgeRetry}>retry scheduled</span> : null}
          {email.stuckSending ? <span className={styles.badgeRetry}>stuck</span> : null}
        </td>
        <td className={styles.cellAttempts}>
          <span className={styles.attemptsText}>
            {email.attempts} / {email.maxAttempts}
          </span>
        </td>
        <td className={styles.cellError}>
          {email.lastError ? (
            <span className={styles.errorMsg} title={email.lastError}>
              {email.lastError.length > 90 ? `${email.lastError.slice(0, 90)}…` : email.lastError}
            </span>
          ) : (
            <span className={styles.errorEmpty}>—</span>
          )}
        </td>
        <td className={styles.cellRetry} title={formatDateTime(email.sendAfter)}>
          <span className={styles.retryText}>{formatRelativeTime(email.sendAfter)}</span>
          <span className={styles.retryText}>{formatDateTime(email.sendAfter)}</span>
        </td>
        <td className={styles.cellSent}>
          <span className={styles.sentText}>{formatDateTime(email.sentAt)}</span>
        </td>
        <td className={styles.cellActions}>
          {canRetry || canCancel ? (
            <div className={styles.actionButtons}>
              {canRetry ? (
                <button
                  className={`${styles.actionButton} ${styles.retryButton} ${actioning ? styles.actionButtonDisabled : ""}`}
                  onClick={onRetry}
                  disabled={actioning}
                  title="Reset to pending and send immediately"
                >
                  <RotateCcw size={12} /> Retry
                </button>
              ) : null}
              {canCancel ? (
                <button
                  className={`${styles.actionButton} ${styles.cancelButton} ${actioning ? styles.actionButtonDisabled : ""}`}
                  onClick={onCancel}
                  disabled={actioning}
                  title="Stop this email from sending"
                >
                  <Ban size={12} /> Cancel
                </button>
              ) : null}
            </div>
          ) : (
            <span className={styles.noActions}>—</span>
          )}
          <button className={styles.expandButton} onClick={onToggle}>
            {expanded ? "Hide details" : "Details"}
          </button>
        </td>
      </tr>
      {expanded ? (
        <tr className={styles.detailRow}>
          <td colSpan={10} className={styles.detailCell}>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>ID</span>
                <span className={styles.detailValue}>{email._id}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Priority</span>
                <span className={styles.detailValue}>P{email.priority}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Resend ID</span>
                <span className={styles.detailValue}>{email.resendId || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>User</span>
                <span className={styles.detailValue}>
                  {email.userName || email.userEmail || email.userId || "—"}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Locked at</span>
                <span className={styles.detailValue}>{formatDateTime(email.lockedAt)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Updated</span>
                <span className={styles.detailValue}>{formatDateTime(email.updatedAt)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Related activity</span>
                <span className={styles.detailValue}>{email.relatedActivityId || "—"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Full error</span>
                <span className={styles.detailError}>{email.lastError || "none"}</span>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
