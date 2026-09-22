"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Activity as ActivityIcon, Loader2 } from "lucide-react";
import { useActivityStore } from "@/store/useActivityStore";
import styles from "./page.module.css";

const ACTIVITY_TYPES = [
  { value: "", label: "All activities" },
  { value: "resume_created", label: "Resume created" },
  { value: "resume_updated", label: "Resume updated" },
  { value: "resume_deleted", label: "Resume deleted" },
  { value: "cover_letter_created", label: "Cover letter created" },
  { value: "cover_letter_generated", label: "Cover letter generated" },
  { value: "job_created", label: "Job created" },
  { value: "application_started", label: "Application started" },
  { value: "application_submitted", label: "Application submitted" },
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

export default function ActivitiesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [filterType, setFilterType] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  const activities = useActivityStore((s) => s.activities);
  const isLoading = useActivityStore((s) => s.isLoading);
  const hasMore = useActivityStore((s) => s.hasMore);
  const nextCursor = useActivityStore((s) => s.nextCursor);
  const fetchActivities = useActivityStore((s) => s.fetchActivities);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.push("/");
      return;
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchActivities({ reset: true, type: filterType || null, entityType: filterEntity || null });
  }, [filterType, filterEntity, status, fetchActivities]);

  const handleLoadMore = () => {
    if (!nextCursor) return;
    fetchActivities({ cursor: nextCursor, type: filterType || null, entityType: filterEntity || null });
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
        <h1 className={styles.title}>
          <ActivityIcon size={22} className={styles.titleIcon} />
          Your Activities
        </h1>
        <p className={styles.subtitle}>A timeline of everything you have done on the platform.</p>
      </div>

      <div className={styles.filters}>
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

      <div className={styles.list}>
        {activities.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <ActivityIcon size={32} className={styles.emptyIcon} />
            <p>No activities yet</p>
            <span>Create a resume, apply to a job, or post a job to see activities here.</span>
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
