"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import styles from "./AdminQueue.module.css";

interface JobItem {
  _id: string;
  title: string;
  description: string;
  status: string;
  companyId?: { name?: string };
  postedBy?: { email?: string };
}

export default function AdminQueue() {
  const [adminJobs, setAdminJobs] = useState<JobItem[]>([]);
  const [adminFilterStatus, setAdminFilterStatus] = useState("pending_review");
  const [adminCounts, setAdminCounts] = useState({ pending_review: 0, active: 0, rejected: 0, total: 0 });
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const fetchAdminJobs = async () => {
    setLoadingAdmin(true);
    try {
      const res = await fetch(`/api/admin/jobs?status=${adminFilterStatus === "all" ? "" : adminFilterStatus}`);
      const data = await res.json();
      if (data.jobs) setAdminJobs(data.jobs);
      if (data.counts) setAdminCounts(data.counts);
    } catch {} finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    fetchAdminJobs();
  }, [adminFilterStatus]);

  const handleAdminModerate = async (jobId: string, action: "approve" | "reject", reason = "") => {
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action, rejectionReason: reason }),
      });
      if (res.ok) fetchAdminJobs();
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={() => setAdminFilterStatus("pending_review")} className={`${styles.chip} ${adminFilterStatus === "pending_review" ? styles.activeChip : ""}`}>Pending Review ({adminCounts.pending_review})</button>
        <button onClick={() => setAdminFilterStatus("active")} className={`${styles.chip} ${adminFilterStatus === "active" ? styles.activeChip : ""}`}>Active ({adminCounts.active})</button>
        <button onClick={() => setAdminFilterStatus("rejected")} className={`${styles.chip} ${adminFilterStatus === "rejected" ? styles.activeChip : ""}`}>Rejected ({adminCounts.rejected})</button>
      </div>

      {loadingAdmin ? (
        <div className={styles.emptyState}><Loader2 size={32} style={{ margin: "0 auto 1rem" }} /><p>Loading Moderation Queue...</p></div>
      ) : adminJobs.length === 0 ? (
        <div className={styles.emptyState}><CheckCircle size={40} color="#10b981" style={{ margin: "0 auto 1rem" }} /><h3>Moderation Queue Clear</h3><p style={{ marginTop: "0.5rem" }}>No job submissions in this queue.</p></div>
      ) : (
        <div className={styles.jobsGrid}>
          {adminJobs.map((job) => (
            <AdminJobCard key={job._id} job={job} onModerate={handleAdminModerate} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminJobCard({ job, onModerate }: { job: JobItem; onModerate: (id: string, action: "approve" | "reject", reason?: string) => void }) {
  return (
    <div className={styles.jobCard}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.jobTitle}>{job.title}</h3>
          <div className={styles.companyName}>Company: {job.companyId?.name || "Unknown"} (Poster: {job.postedBy?.email})</div>
        </div>
      </div>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-600)", background: "var(--gray-50)", padding: "0.5rem", borderRadius: "6px" }}>
        {job.description.slice(0, 200)}...
      </p>
      <div className={styles.cardFooter}>
        <span style={{ fontSize: "var(--text-xs)" }}>Status: <strong>{job.status}</strong></span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {job.status !== "active" && <button onClick={() => onModerate(job._id, "approve")} style={{ background: "#10b981", color: "white", border: "none", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "var(--text-xs)", fontWeight: "bold", cursor: "pointer" }}>Approve Ad</button>}
          {job.status !== "rejected" && <button onClick={() => { const reason = prompt("Rejection Reason:", "Violates community guidelines or scam alert."); if (reason) onModerate(job._id, "reject", reason); }} style={{ background: "#ef4444", color: "white", border: "none", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "var(--text-xs)", fontWeight: "bold", cursor: "pointer" }}>Reject / Flag Scam</button>}
        </div>
      </div>
    </div>
  );
}
