"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, DollarSign, Sparkles, Users, Briefcase, MapPin, Loader2, ArrowRight, Pencil, FileText } from "lucide-react";
import styles from "./EmployerHub.module.css";

interface JobItem {
  _id: string;
  title: string;
  category: string;
  jobType: string;
  workplaceType: string;
  location: string;
  hideSalary: boolean;
  salaryMin?: number;
  salaryMax?: number;
  isFeatured: boolean;
  description: string;
  status: string;
  rejectionReason?: string;
  viewsCount: number;
  applicationsCount: number;
}

export default function EmployerHub({ isEmployer }: { isEmployer: boolean }) {
  const router = useRouter();
  const [regName, setRegName] = useState("");
  const [regWebsite, setRegWebsite] = useState("");
  const [regIndustry, setRegIndustry] = useState("Software & IT");
  const [regCompanySize, setRegCompanySize] = useState("11-50");
  const [regLocation, setRegLocation] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  const [employerJobs, setEmployerJobs] = useState<JobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [viewingApplicantsJobId, setViewingApplicantsJobId] = useState<string | null>(null);
  const [applicantsList, setApplicantsList] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const fetchEmployerJobs = async () => {
    if (!isEmployer) return;
    setLoadingJobs(true);
    try {
      const res = await fetch(`/api/jobs?mine=true&limit=50`);
      const data = await res.json();
      setEmployerJobs(data.jobs || []);
    } catch {
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (isEmployer) fetchEmployerJobs();
    else setLoadingJobs(false);
  }, [isEmployer]);

  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError("Organization name is required");
      return;
    }
    setRegLoading(true);
    setRegError("");
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          website: regWebsite.trim(),
          industry: regIndustry,
          companySize: regCompanySize,
          location: regLocation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Failed to register organization");
        setRegLoading(false);
        return;
      }
      window.location.reload();
    } catch (err: any) {
      setRegError(err.message || "Failed to register organization");
      setRegLoading(false);
    }
  };

  const handleViewApplicants = async (jobId: string) => {
    setViewingApplicantsJobId(jobId);
    setLoadingApplicants(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/applicants`);
      const data = await res.json();
      setApplicantsList(data.applicants || []);
    } catch {} finally {
      setLoadingApplicants(false);
    }
  };

  const handleUpdateApplicantStatus = async (appId: string, statusVal: string) => {
    try {
      const res = await fetch(`/api/jobs/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusVal }),
      });
      if (res.ok) {
        setApplicantsList((prev) => prev.map((a) => (a._id === appId ? { ...a, status: statusVal } : a)));
      }
    } catch {}
  };

  if (!isEmployer) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className={styles.employerBannerCard}>
          <div className={styles.bannerHeader}>
            <Building2 size={36} color="var(--primary-900)" />
            <div>
              <h2 className={styles.bannerTitle}>Hire Top Talent & Skip Manual Resume Screening</h2>
              <p className={styles.bannerText}>Register as a hiring organization to post free job ads, reach qualified candidates, and leverage instant AI Resume Match Scores.</p>
            </div>
          </div>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitItem}><div className={styles.benefitIcon}><DollarSign size={20} /></div><div><div className={styles.benefitTitle}>100% Free Job Posting</div><div className={styles.benefitDesc}>Post unlimited job listings at zero cost.</div></div></div>
            <div className={styles.benefitItem}><div className={styles.benefitIcon}><Sparkles size={20} /></div><div><div className={styles.benefitTitle}>Instant AI Candidate Match</div><div className={styles.benefitDesc}>Skip manual resume screening.</div></div></div>
            <div className={styles.benefitItem}><div className={styles.benefitIcon}><Users size={20} /></div><div><div className={styles.benefitTitle}>Direct Applications</div><div className={styles.benefitDesc}>Receive resumes directly in your dashboard.</div></div></div>
          </div>
        </div>
        <div className={styles.formCard}>
          <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", marginBottom: "1rem", color: "var(--primary-900)" }}>Register Your Organization (1 Minute Setup)</h3>
          <form onSubmit={handleRegisterOrg} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {regError && <div className={styles.errorBanner}>{regError}</div>}
            <div className={styles.field}><label className={styles.label}>Company / Organization Name *</label><input type="text" className={styles.input} placeholder="e.g. Acme Corporation" value={regName} onChange={(e) => setRegName(e.target.value)} required /></div>
            <div className={styles.formGrid}>
              <div className={styles.field}><label className={styles.label}>Industry</label><select className={styles.select} value={regIndustry} onChange={(e) => setRegIndustry(e.target.value)}><option value="Software & IT">Software & IT</option><option value="Design & Creative">Design & Creative</option><option value="Other">Other</option></select></div>
              <div className={styles.field}><label className={styles.label}>Company Size</label><select className={styles.select} value={regCompanySize} onChange={(e) => setRegCompanySize(e.target.value)}><option value="11-50">11-50</option><option value="51-200">51-200</option></select></div>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}><label className={styles.label}>Website URL (Optional)</label><input type="url" className={styles.input} value={regWebsite} onChange={(e) => setRegWebsite(e.target.value)} /></div>
              <div className={styles.field}><label className={styles.label}>HQ Location (Optional)</label><input type="text" className={styles.input} value={regLocation} onChange={(e) => setRegLocation(e.target.value)} /></div>
            </div>
            <button type="submit" className={styles.submitBtn} disabled={regLoading}>{regLoading ? <Loader2 size={18} /> : <>Complete Setup & Post Jobs <ArrowRight size={16} /></>}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--primary-900)" }}>Your Posted Job Ads</h2>
        <button onClick={() => router.push("/dashboard/jobs/new")} className={styles.employerCtaBtn}>
          Post New Job Ad
        </button>
      </div>

      {loadingJobs ? (
        <div className={styles.emptyState}><Loader2 size={32} style={{ margin: "0 auto 1rem" }} /><p>Loading your job ads...</p></div>
      ) : employerJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <Briefcase size={40} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <h3>No Jobs Posted Yet</h3>
          <p style={{ marginTop: "0.5rem" }}>Post your first job ad for free to start receiving candidate applications.</p>
          <button onClick={() => router.push("/dashboard/jobs/new")} className={styles.employerCtaBtn} style={{ marginTop: "1rem" }}>Post Your First Job</button>
        </div>
      ) : (
        <div className={styles.jobsGrid}>
          {employerJobs.map((job) => (
            <EmployerJobCard key={job._id} job={job} onViewApplicants={handleViewApplicants} />
          ))}
        </div>
      )}

      {viewingApplicantsJobId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Candidate Applications</h2>
              <button onClick={() => setViewingApplicantsJobId(null)} className={styles.closeBtn}>&times;</button>
            </div>
            {loadingApplicants ? (
              <div style={{ textAlign: "center", padding: "2rem" }}><Loader2 size={24} /></div>
            ) : applicantsList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray-500)" }}>No applications yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {applicantsList.map((app) => (
                  <div key={app._id} style={{ border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div><strong>{app.user?.name || "Candidate"}</strong><div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>{app.user?.email}</div></div>
                      {app.aiMatchScore !== undefined && <span style={{ background: "#ecfdf5", color: "#047857", fontSize: "var(--text-xs)", fontWeight: "bold", padding: "0.2rem 0.5rem", borderRadius: "9999px" }}><Sparkles size={12} style={{ display: "inline" }} /> AI Match: {app.aiMatchScore}%</span>}
                    </div>
                    {app.coverLetterText && <div style={{ background: "var(--gray-50)", padding: "0.75rem", borderRadius: "6px", fontSize: "var(--text-xs)", marginTop: "0.5rem" }}><strong>Message:</strong> {app.coverLetterText}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--gray-100)" }}>
                      {app.resumeId?._id ? <Link href={`/editor/${app.resumeId._id}`} target="_blank" style={{ fontSize: "var(--text-xs)", color: "var(--primary-600)", fontWeight: "bold" }}><FileText size={13} style={{ display: "inline" }} /> View Resume</Link> : <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)" }}>No Resume</span>}
                      <select className={styles.select} value={app.status} onChange={(e) => handleUpdateApplicantStatus(app._id, e.target.value)} style={{ padding: "0.2rem 0.5rem", fontSize: "var(--text-xs)" }}>
                        <option value="applied">Applied</option><option value="under_review">Under Review</option><option value="shortlisted">Shortlisted</option><option value="interviewing">Interviewing</option><option value="offered">Offered</option><option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployerJobCard({ job, onViewApplicants }: { job: JobItem; onViewApplicants: (id: string) => void }) {
  const router = useRouter();
  const plainDesc = job.description ? job.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
  return (
    <div className={styles.jobCard}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.jobTitle}>{job.title}</h3>
          <div className={styles.companyName}>{job.category} • {job.jobType} • {job.location}</div>
        </div>
        {job.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
      </div>
      <div className={styles.tagsRow}>
        <span className={styles.tag}><MapPin size={13} /> {job.location} ({job.workplaceType ?? "remote"})</span>
        <span className={styles.tag}><Briefcase size={13} /> {job.jobType}</span>
        {!job.hideSalary && job.salaryMin && (
          <span className={`${styles.tag} ${styles.salaryTag}`}><DollarSign size={13} /> ${job.salaryMin.toLocaleString()}{job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : "+"} / yr</span>
        )}
      </div>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-600)", background: "var(--gray-50)", padding: "0.5rem", borderRadius: "6px" }}>
        {plainDesc.slice(0, 200)}{plainDesc.length > 200 ? "…" : ""}
      </p>
      <div className={styles.cardFooter}>
        <span style={{ fontSize: "var(--text-xs)" }}>Status: <strong style={{ color: job.status === "active" ? "#047857" : "#b45309" }}>{job.status.replace("_", " ").toUpperCase()}</strong> • {job.viewsCount ?? 0} views • {job.applicationsCount ?? 0} applicants</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => router.push(`/dashboard/jobs/${job._id}`)} className={styles.inlineAction} style={{ padding: "0.3rem 0.75rem", fontSize: "var(--text-xs)" }}>
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => onViewApplicants(job._id)} className={styles.applyBtn}>
            View Applicants ({job.applicationsCount || 0})
          </button>
        </div>
      </div>
      {job.rejectionReason && (
        <div style={{ fontSize: "var(--text-xs)", color: "#dc2626", background: "#fef2f2", padding: "0.5rem", borderRadius: "4px" }}>Admin Note: {job.rejectionReason}</div>
      )}
    </div>
  );
}
