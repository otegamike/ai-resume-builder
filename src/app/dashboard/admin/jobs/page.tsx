"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Star,
  Building2,
  AlertTriangle,
  Loader2,
  Clock,
  ExternalLink,
} from "lucide-react";
import styles from "./adminJobs.module.css";

interface JobCompany {
  _id: string;
  name: string;
  website?: string;
  isVerified?: boolean;
}

interface AdminJob {
  _id: string;
  title: string;
  slug: string;
  companyId: JobCompany;
  postedBy?: {
    name?: string;
    email?: string;
  };
  jobType: string;
  workplaceType: string;
  location: string;
  description: string;
  status: string;
  rejectionReason?: string;
  isFeatured: boolean;
  isPinned: boolean;
  createdAt: string;
}

export default function AdminJobModerationPage() {
  const { data: session, status } = useSession();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [activeTab, setActiveTab] = useState("pending_review");
  const [counts, setCounts] = useState({ pending_review: 0, active: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAdminJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs?status=${activeTab === "all" ? "" : activeTab}`);
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error("Error fetching admin jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchAdminJobs();
    }
  }, [session, activeTab]);

  const handleModerate = async (jobId: string, action: "approve" | "reject", reason = "") => {
    setProcessingId(jobId);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          action,
          rejectionReason: reason,
        }),
      });

      if (res.ok) {
        fetchAdminJobs();
      }
    } catch (err) {
      console.error("Error moderating job:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleFeatured = async (jobId: string, currentFeatured: boolean) => {
    setProcessingId(jobId);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          isFeatured: !currentFeatured,
        }),
      });

      if (res.ok) {
        fetchAdminJobs();
      }
    } catch (err) {
      console.error("Error toggling featured status:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.container} style={{ textAlign: "center", paddingTop: "5rem" }}>
        <Loader2 className="loading_icon" size={36} style={{ margin: "0 auto 1rem" }} />
        <p>Loading Admin Job Moderation Queue...</p>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return (
      <div className={styles.container} style={{ textAlign: "center", paddingTop: "5rem" }}>
        <h2>Access Denied</h2>
        <p>You must be a Site Administrator to access job moderation.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <ShieldCheck color="#6366f1" size={32} /> Job Ad Moderation & Anti-Scam Review
        </h1>
        <p className={styles.subtitle}>
          Review submitted employer job listings, filter spam/harmful ads, and manage featured posts.
        </p>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === "pending_review" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("pending_review")}
        >
          <Clock size={16} /> Pending Review <span className={styles.badge}>{counts.pending_review}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "active" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("active")}
        >
          <CheckCircle size={16} /> Published (Active) <span className={styles.badge}>{counts.active}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "rejected" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("rejected")}
        >
          <XCircle size={16} /> Rejected / Flagged <span className={styles.badge}>{counts.rejected}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "all" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Listings <span className={styles.badge}>{counts.total}</span>
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
          <h3>No Job Listings in {activeTab.replace("_", " ").toUpperCase()} Queue</h3>
          <p style={{ marginTop: "0.5rem" }}>All pending job submissions have been processed.</p>
        </div>
      ) : (
        <div>
          {jobs.map((job) => {
            const companyName = job.companyId?.name || "Unknown Company";
            const posterEmail = job.postedBy?.email || "Unknown";

            return (
              <div key={job._id} className={styles.jobCard}>
                <div className={styles.cardTop}>
                  <div>
                    <h2 className={styles.jobTitle}>{job.title}</h2>
                    <div className={styles.companyRow}>
                      <Building2 size={15} /> <strong>{companyName}</strong> (Posted by: {posterEmail})
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link
                      href={`/jobs/${job.slug || job._id}`}
                      target="_blank"
                      style={{
                        color: "#6366f1",
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      Preview Ad <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>

                <div className={styles.descriptionSnippet}>
                  {job.description.length > 280 ? `${job.description.slice(0, 280)}...` : job.description}
                </div>

                <div className={styles.actionsRow}>
                  <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    Submitted {new Date(job.createdAt).toLocaleDateString()} &bull; Status:{" "}
                    <strong style={{ color: "#fff" }}>{job.status}</strong>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      onClick={() => handleToggleFeatured(job._id, job.isFeatured)}
                      className={styles.featureBtn}
                      disabled={processingId === job._id}
                    >
                      <Star size={15} fill={job.isFeatured ? "#fbbf24" : "none"} />{" "}
                      {job.isFeatured ? "Featured" : "Feature Ad"}
                    </button>

                    {job.status !== "active" && (
                      <button
                        onClick={() => handleModerate(job._id, "approve")}
                        className={styles.approveBtn}
                        disabled={processingId === job._id}
                        id={`approve-job-${job._id}`}
                      >
                        <CheckCircle size={16} /> Approve & Publish
                      </button>
                    )}

                    {job.status !== "rejected" && (
                      <button
                        onClick={() => {
                          const reason = prompt(
                            "Enter rejection / anti-scam flag reason:",
                            "Violates community job ad standards or potential scam alert."
                          );
                          if (reason !== null) {
                            handleModerate(job._id, "reject", reason);
                          }
                        }}
                        className={styles.rejectBtn}
                        disabled={processingId === job._id}
                        id={`reject-job-${job._id}`}
                      >
                        <XCircle size={16} /> Reject / Flag Scam
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
