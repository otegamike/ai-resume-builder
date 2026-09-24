"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Search, Bot, AlertTriangle, Clock, Cpu } from "lucide-react";
import styles from "./AiLogsTab.module.css";

interface AiLog {
  _id: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  queueTimeMs: number | null;
  latencyMs: number;
  truncated: boolean;
  finishReason: string;
  error: boolean;
  errorMessage: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  createdAt: string;
}

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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

export default function AiLogsTab() {
  const [events, setEvents] = useState<AiLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterFeature, setFilterFeature] = useState("");
  const [filterModel, setFilterModel] = useState("");
  const [filterError, setFilterError] = useState("");
  const [filterTruncated, setFilterTruncated] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = useCallback(
    async (opts?: { cursor?: string | null; reset?: boolean }) => {
      const reset = opts?.reset ?? !opts?.cursor;
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "50");
        if (opts?.cursor) params.set("cursor", opts.cursor);
        if (filterFeature) params.set("feature", filterFeature);
        if (filterModel) params.set("model", filterModel);
        if (filterError) params.set("error", filterError);
        if (filterTruncated) params.set("truncated", filterTruncated);
        if (search) params.set("search", search);

        const res = await fetch(`/api/admin/ai-usage-logs?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const list: AiLog[] = data.events || [];
        if (reset) {
          setEvents(list);
        } else {
          setEvents((prev) => [...prev, ...list]);
        }
        setHasMore(data.hasMore ?? false);
        setNextCursor(data.nextCursor ?? null);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    },
    [filterFeature, filterModel, filterError, filterTruncated, search]
  );

  useEffect(() => {
    fetchLogs({ reset: true });
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleLoadMore = () => {
    if (!nextCursor) return;
    fetchLogs({ cursor: nextCursor });
  };

  const distinctFeatures = Array.from(new Set(events.map((e) => e.feature))).sort();
  const distinctModels = Array.from(new Set(events.map((e) => e.model))).sort();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Bot size={22} className={styles.titleIcon} />
          AI Logs
        </h2>
        <p className={styles.subtitle}>
          Every AI usage event — model, tokens, latency, errors and user. Filter and page through the full log.
        </p>
      </div>

      <div className={styles.filters}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            className={styles.searchInput}
            placeholder="Search feature, model, finish reason, error message..."
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
            value={filterFeature}
            onChange={(e) => setFilterFeature(e.target.value)}
          >
            <option value="">All features</option>
            {distinctFeatures.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
          >
            <option value="">All models</option>
            {distinctModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterError}
            onChange={(e) => setFilterError(e.target.value)}
          >
            <option value="">All — errors & ok</option>
            <option value="true">Errors only</option>
            <option value="false">No error</option>
          </select>
          <select
            className={styles.select}
            value={filterTruncated}
            onChange={(e) => setFilterTruncated(e.target.value)}
          >
            <option value="">All — truncated & full</option>
            <option value="true">Truncated only</option>
            <option value="false">Not truncated</option>
          </select>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span className={styles.metaText}>
          {events.length} event{events.length !== 1 ? "s" : ""} loaded
        </span>
        <span className={styles.metaHint}>Sorted newest first — shows every field from AiUsageEvent.</span>
      </div>

      {events.length === 0 && !isLoading ? (
        <div className={styles.emptyState}>
          <Bot size={32} className={styles.emptyIcon} />
          <p>No AI logs found</p>
          <span>Try adjusting filters or search.</span>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Feature</th>
                <th>Model</th>
                <th title="Prompt / Completion / Total">Tokens (p / c / total)</th>
                <th>
                  <span className={styles.thWithIcon}>
                    <Clock size={12} /> Latency
                  </span>
                </th>
                <th>Queue</th>
                <th>Trunc</th>
                <th>Finish</th>
                <th>Error</th>
                <th>User</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e._id} className={e.error ? styles.rowError : undefined}>
                  <td className={styles.cellTime} title={formatDateTime(e.createdAt)}>
                    <span className={styles.timeMain}>{formatRelativeTime(e.createdAt)}</span>
                    <span className={styles.timeSub}>{formatDateTime(e.createdAt)}</span>
                  </td>
                  <td>
                    <span className={styles.featureBadge}>{e.feature}</span>
                  </td>
                  <td>
                    <span className={styles.modelBadge} title={e.model}>
                      <Cpu size={12} className={styles.inlineIcon} />
                      {e.model}
                    </span>
                  </td>
                  <td className={styles.cellTokens}>
                    <span className={styles.tokenNum}>{e.promptTokens}</span>
                    <span className={styles.tokenSep}>/</span>
                    <span className={styles.tokenNum}>{e.completionTokens}</span>
                    <span className={styles.tokenSep}>/</span>
                    <span className={styles.tokenTotal}>{e.totalTokens}</span>
                  </td>
                  <td className={styles.cellLatency}>{e.latencyMs}ms</td>
                  <td className={styles.cellQueue}>{e.queueTimeMs != null ? `${e.queueTimeMs}ms` : "—"}</td>
                  <td>
                    {e.truncated ? (
                      <span className={styles.badgeTruncated}>yes</span>
                    ) : (
                      <span className={styles.badgeOk}>no</span>
                    )}
                  </td>
                  <td className={styles.cellFinish} title={e.finishReason || ""}>
                    {e.finishReason || "—"}
                  </td>
                  <td className={styles.cellError}>
                    {e.error ? (
                      <span className={styles.badgeError} title={e.errorMessage || "error"}>
                        <AlertTriangle size={12} /> error
                      </span>
                    ) : (
                      <span className={styles.badgeOk}>ok</span>
                    )}
                    {e.error && e.errorMessage ? (
                      <span className={styles.errorMsg} title={e.errorMessage}>
                        {e.errorMessage.length > 80 ? `${e.errorMessage.slice(0, 80)}…` : e.errorMessage}
                      </span>
                    ) : null}
                  </td>
                  <td className={styles.cellUser}>
                    {e.userEmail ? (
                      <span className={styles.userCell} title={`${e.userName || ""} ${e.userEmail}`}>
                        {e.userImage ? (
                          <img src={e.userImage} alt={e.userName || "user"} className={styles.userAvatar} />
                        ) : (
                          <span className={styles.userFallback}>{(e.userName || e.userEmail || "?").charAt(0).toUpperCase()}</span>
                        )}
                        <span className={styles.userEmail}>{e.userEmail}</span>
                      </span>
                    ) : e.userId ? (
                      <span className={styles.userId} title={e.userId}>
                        {e.userId.slice(-6)}
                      </span>
                    ) : (
                      <span className={styles.noUser}>system</span>
                    )}
                    {e.userName && e.userEmail ? <span className={styles.userName}>{e.userName}</span> : null}
                  </td>
                  <td className={styles.cellId} title={e._id}>
                    {e._id.slice(-8)}
                  </td>
                </tr>
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

      {hasMore && events.length > 0 && !isLoading && (
        <button className={styles.loadMoreButton} onClick={handleLoadMore}>
          Load more
        </button>
      )}
    </div>
  );
}
