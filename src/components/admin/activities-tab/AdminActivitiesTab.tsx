"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import styles from "./AdminActivitiesTab.module.css";
import type { Activity } from "@/types/ActivityData";

const ACTIVITY_TYPES = [
  { value: "", label: "All types" },
  { value: "resume_created", label: "Resume created" },
  { value: "resume_updated", label: "Resume updated" },
  { value: "resume_deleted", label: "Resume deleted" },
  { value: "resume_imported", label: "Resume imported" },
  { value: "cover_letter_created", label: "Cover letter created" },
  { value: "cover_letter_generated", label: "Cover letter generated" },
  { value: "job_created", label: "Job created" },
  { value: "job_updated", label: "Job updated" },
  { value: "job_status_changed", label: "Job status" },
  { value: "application_started", label: "Application started" },
  { value: "application_submitted", label: "Application submitted" },
  { value: "application_viewed_by_employer", label: "Viewed by employer" },
  { value: "application_status_changed", label: "Status changed" },
  { value: "application_withdrawn", label: "Withdrawn" },
  { value: "organization_registered", label: "Organization" },
  { value: "onboarding_completed", label: "Onboarding" },
];

const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "resume", label: "Resume" },
  { value: "coverLetter", label: "Cover letter" },
  { value: "jobAd", label: "Job" },
  { value: "jobApplication", label: "Application" },
  { value: "company", label: "Company" },
  { value: "user", label: "User" },
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

export default function AdminActivitiesTab() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchActivities = async (opts?: { cursor?: string | null; reset?: boolean }) => {
    const reset = opts?.reset ?? !opts?.cursor;
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (opts?.cursor) params.set("cursor", opts.cursor);
      if (filterType) params.set("type", filterType);
      if (filterEntity) params.set("entityType", filterEntity);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/activities?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const list: Activity[] = data.activities || [];
      if (reset) {
        setActivities(list);
      } else {
        setActivities((prev) => [...prev, ...list]);
      }
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterEntity, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleLoadMore = () => {
    if (!nextCursor) return;
    fetchActivities({ cursor: nextCursor });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <ShieldCheck size={22} className={styles.titleIcon} />
          Activities
        </h2>
        <p className={styles.subtitle}>Full site activity feed with filters. Track every user action across the platform.</p>
      </div>

      <div className={styles.filters}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            className={styles.searchInput}
            placeholder="Search by title, email, name..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.list}>
        {activities.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <ShieldCheck size={32} className={styles.emptyIcon} />
            <p>No activities found</p>
            <span>Try adjusting your filters or search.</span>
          </div>
        ) : (
          activities.map((a) => (
            <div key={a._id} className={styles.item}>
              <div className={styles.itemDot} data-type={a.type} />
              <div className={styles.itemContent}>
                <p className={styles.itemTitle}>{a.title}</p>
                {a.detail && <p className={styles.itemDetail}>{a.detail}</p>}
                <div className={styles.itemMeta}>
                  <span className={styles.typeBadge}>{a.type}</span>
                  {a.entityType && <span className={styles.entityBadge}>{a.entityType}</span>}
                  {a.actorEmail && <span className={styles.actorEmail}>{a.actorEmail}</span>}
                  {a.actorName && <span className={styles.actorName}>{a.actorName}</span>}
                  <span className={styles.itemTime}>{formatRelativeTime(a.createdAt)}</span>
                </div>
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

      {hasMore && activities.length > 0 && !isLoading && (
        <button className={styles.loadMoreButton} onClick={handleLoadMore}>
          Load more
        </button>
      )}
    </div>
  );
}
