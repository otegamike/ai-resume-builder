"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Briefcase } from "lucide-react";
import styles from "./ApplicationHistory.module.css";
import ApplicationDetailModal from "./ApplicationDetailModal";

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export default function ApplicationHistory() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const fetchMine = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job-applications/mine");
      const data = await res.json();
      if (res.ok) setApplications(data.applications || data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const handleWithdraw = async (id: string) => {
    const confirmed = typeof window !== "undefined" ? window.confirm("Withdraw this application? The employer will no longer see it.") : true;
    if (!confirmed) return;
    setWithdrawingId(id);
    try {
      const res = await fetch(`/api/job-applications/${id}/withdraw`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to withdraw");
      setApplications((prev) => prev.map((a) => (String(a._id) === String(id) ? { ...a, status: "withdrawn" } : a)));
      setSelected((prev: any) => (prev && String(prev._id) === String(id) ? { ...prev, status: "withdrawn" } : prev));
    } catch (e: any) {
      alert(e.message || "Failed to withdraw");
    } finally {
      setWithdrawingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingRow}>
        <Loader2 size={24} className="loading_icon" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Briefcase size={32} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
        <h3>No applications yet</h3>
        <p style={{ marginTop: "0.25rem", fontSize: "var(--text-xs)" }}>Jobs you apply to will appear here.</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {applications.map((app) => (
        <ApplicationCard key={app._id} application={app} onClick={() => setSelected(app)} />
      ))}

      <ApplicationDetailModal
        application={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onWithdraw={handleWithdraw}
        withdrawing={!!withdrawingId && String(selected?._id) === String(withdrawingId)}
      />
    </div>
  );
}

function ApplicationCard({ application, onClick }: { application: any; onClick: () => void }) {
  const job = application.jobId || application.job || {};
  const company = job.companyId || application.companyId || {};
  const title = job.title || application.role || "Job";
  const companyName = company.name || job.companyName || application.company || "";
  const status: string = application.status || "submitted";
  const matchScore: number | undefined = application.tailoredMatchScore ?? application.matchScore ?? application.analysisReport?.score;
  const appliedAt: string = application.createdAt || application.appliedDate || "";

  return (
    <div className={styles.card} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.jobTitle}>{title}</div>
          <div className={styles.companyName}>{companyName}</div>
        </div>
        <span className={`${styles.statusPill} ${status === "withdrawn" ? styles.statusWithdrawn : styles.statusSubmitted}`}>{status.replace("_", " ").toUpperCase()}</span>
      </div>
      <div className={styles.metaRow}>
        {company.location || job.location ? <span>{company.location || job.location}</span> : null}
        {typeof matchScore === "number" && <span>Match {matchScore}%</span>}
        {appliedAt && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><Clock size={12} /> {formatDate(appliedAt)}</span>}
      </div>
      {application.coverLetterText && <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-600)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{application.coverLetterText.slice(0, 80)}…</p>}
    </div>
  );
}
