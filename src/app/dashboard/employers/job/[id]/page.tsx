"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Briefcase, Clock, CheckCircle2, Loader2, DollarSign } from "lucide-react";
import styles from "./page.module.css";
import EmployerApplicantModal from "@/components/jobs/employer-applicants/EmployerApplicantModal";

interface JobItem {
  _id: string;
  title: string;
  slug: string;
  companyId?: { name?: string; isVerified?: boolean };
  jobType: string;
  workplaceType: string;
  location: string;
  category: string;
  description: string;
  status: string;
  isFeatured: boolean;
  viewsCount: number;
  applicationsCount: number;
  createdAt: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
  hideSalary: boolean;
  experienceLevel: string;
}

const STATUS_CHIPS = ["All", "Submitted", "Under Review", "Shortlisted", "Interviewing", "Offered", "Rejected", "Withdrawn"] as const;
const statusValueMap: Record<string, string> = {
  All: "",
  Submitted: "submitted",
  "Under Review": "under_review",
  Shortlisted: "shortlisted",
  Interviewing: "interviewing",
  Offered: "offered",
  Rejected: "rejected",
  Withdrawn: "withdrawn",
};

export default function EmployerJobDetailPage() {
  const params = useParams() as { id: string };
  const id = params.id;
  const router = useRouter();
  const [job, setJob] = useState<JobItem | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${id}/applicants`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setJob(data.job);
      setApplicants(data.applicants || []);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = (appId: string, newStatus: string) => {
    setApplicants((prev) => prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a)));
    setSelectedApp((prev: any) => (prev && prev._id === appId ? { ...prev, status: newStatus } : prev));
  };

  const filtered = applicants.filter((a) => {
    if (activeFilter === "All") return a.status !== "withdrawn";
    const val = statusValueMap[activeFilter];
    return a.status === val;
  });

  const plainDesc = job?.description ? job.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingRow}><Loader2 size={24} /></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}><p>{error || "Job not found"}</p><Link href="/dashboard/employers" className={styles.backLink}><ArrowLeft size={16} /> Back</Link></div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button onClick={() => router.push("/dashboard/employers")} className={styles.backLink}><ArrowLeft size={16} /> Back to Employer Hub</button>

      <div className={styles.headerCard}>
        <div className={styles.headerMain}>
          <div>
            <div className={styles.companyTitleRow}>
              <span className={styles.companyName}>{job.companyId?.name || "Company"}</span>
              {job.companyId?.isVerified && <span className={styles.verifiedTag}><CheckCircle2 size={14} /> Verified</span>}
            </div>
            <h1 className={styles.title}>{job.title}</h1>
            <div className={styles.metaRow}>
              <span><MapPin size={14} /> {job.location} ({job.workplaceType})</span>
              <span><Briefcase size={14} /> {job.jobType}</span>
              <span><Clock size={14} /> Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {!job.hideSalary && job.salaryMin && (
          <div className={styles.salaryBox}>
            <span className={styles.salaryLabel}>Salary Range</span>
            <span className={styles.salaryValue}>{job.salaryCurrency || "USD"} {job.salaryMin.toLocaleString()}{job.salaryMax ? ` - ${job.salaryMax.toLocaleString()}` : ""} {job.salaryPeriod || "yearly"}</span>
          </div>
        )}

      <p className={styles.truncatedDesc}>{plainDesc.slice(0, 220)}{plainDesc.length > 220 ? "…" : ""}</p>
      <div className={styles.statsRow}>
        <span>Views: <strong>{job.viewsCount ?? 0}</strong></span>
        <span>Applicants: <strong>{applicants.length}</strong></span>
        <span>Status:  <strong style={{ color: job.status === "active" ? "#047857" : "#b45309" }}>{job.status}</strong></span>
        {job.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
      </div>
      </div>
      

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Applicants ({filtered.length}) {activeFilter !== "All" ? `(${activeFilter})` : ""}</h2>
      </div>

      <div className={`${styles.chipRow} hideScrollbar`}>
        {STATUS_CHIPS.map((label) => (
          <button
            key={label}
            onClick={() => setActiveFilter(label)}
            className={`${styles.chip} ${activeFilter === label ? styles.activeChip : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}><p>No applicants in this filter.</p></div>
      ) : (
        <div className={styles.list}>
          {filtered.map((app) => (
            <div key={app._id} className={styles.applicantRow} onClick={() => setSelectedApp(app)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelectedApp(app)}>
              <div>
                <strong className={styles.name}>{app.user?.name || app.applicantId?.name || "Candidate"}</strong>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>{app.user?.email || app.applicantId?.email || ""}</div>
              </div>
              <span className={styles.statusPill}>{app.status.replace("_", " ").toUpperCase()}</span>
              {typeof app.aiMatchScore === "number" && <span className={styles.scorePill}>Match {app.aiMatchScore}%</span>}
            </div>
          ))}
        </div>
      )}

      <EmployerApplicantModal application={selectedApp} open={!!selectedApp} onClose={() => setSelectedApp(null)} onStatusChange={handleStatusChange} />
    </div>
  );
}
