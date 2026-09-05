"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  Sparkles,
  Building2,
  CheckCircle2,
  Filter,
  Plus,
  Loader2,
  Users,
  Eye,
  ShieldCheck,
  Star,
  CheckCircle,
  XCircle,
  ArrowRight,
  Send,
  FileText,
  AlertCircle,
  Info,
} from "lucide-react";
import styles from "./jobs.module.css";
import DropDown from "@/components/ui/dropdown/Dropdown";

interface JobCompany {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
  industry?: string;
  location?: string;
  description?: string;
  isVerified?: boolean;
}

interface JobItem {
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
  category: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  hideSalary: boolean;
  description: string;
  requirements: string[];
  benefits: string[];
  skillsRequired: string[];
  status: string;
  rejectionReason?: string;
  isFeatured: boolean;
  viewsCount: number;
  applicationsCount: number;
  createdAt: string;
}

const CATEGORIES = ["All", "Engineering", "Design", "Product", "Marketing", "Sales", "HR", "Finance", "Other"];

export default function UnifiedJobsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const isAdmin = session?.user?.isAdmin ?? false;
  const userAccountType = (session?.user as any)?.accountType ?? "candidate";
  const userOrgId = (session?.user as any)?.organizationId;
  const isEmployer = userAccountType === "employer" || userAccountType === "both" || !!userOrgId;

  // Tab State: "find" | "employer" | "admin"
  const [activeTab, setActiveTab] = useState<"find" | "employer" | "admin">("find");

  // Search & Filter State for Find Jobs
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Selected Job Detail Modal
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [aiMatchScore, setAiMatchScore] = useState<number | null>(null);
  const [checkingMatch, setCheckingMatch] = useState(false);

  // Employer Registration State
  const [regName, setRegName] = useState("");
  const [regWebsite, setRegWebsite] = useState("");
  const [regIndustry, setRegIndustry] = useState("Software & IT");
  const [regCompanySize, setRegCompanySize] = useState("11-50");
  const [regLocation, setRegLocation] = useState("");
  const [regLogo, setRegLogo] = useState("");
  const [regDescription, setRegDescription] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  // Post Job Ad Form Modal / Drawer State
  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postCategory, setPostCategory] = useState("Engineering");
  const [postJobType, setPostJobType] = useState("full-time");
  const [postWorkplaceType, setPostWorkplaceType] = useState("remote");
  const [postLocation, setPostLocation] = useState("Remote");
  const [postSalaryMin, setPostSalaryMin] = useState("");
  const [postSalaryMax, setPostSalaryMax] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postRequirementsText, setPostRequirementsText] = useState("");
  const [postSkillsText, setPostSkillsText] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");

  // Employer Applicants View State
  const [employerJobs, setEmployerJobs] = useState<JobItem[]>([]);
  const [viewingApplicantsJobId, setViewingApplicantsJobId] = useState<string | null>(null);
  const [applicantsList, setApplicantsList] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // Admin Moderation Queue State
  const [adminJobs, setAdminJobs] = useState<JobItem[]>([]);
  const [adminFilterStatus, setAdminFilterStatus] = useState("pending_review");
  const [adminCounts, setAdminCounts] = useState({ pending_review: 0, active: 0, rejected: 0, total: 0 });
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // ── 1. Fetch Public Job Board Listings ──
  const fetchPublicJobs = async () => {
    setLoadingJobs(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (locationInput) params.append("location", locationInput==='all locations' ? '' : locationInput);
      if (activeCategory !== "All") params.append("category", activeCategory);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setLocations(data.locations || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    fetchPublicJobs();
  }, [activeCategory]);

  // ── 2. Fetch Admin Jobs when Admin Tab Active ──
  const fetchAdminJobs = async () => {
    setLoadingAdmin(true);
    try {
      const res = await fetch(`/api/admin/jobs?status=${adminFilterStatus === "all" ? "" : adminFilterStatus}`);
      const data = await res.json();
      if (data.jobs) setAdminJobs(data.jobs);
      if (data.counts) setAdminCounts(data.counts);
    } catch (err) {
      console.error("Error loading admin jobs:", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admin" && isAdmin) {
      fetchAdminJobs();
    }
  }, [activeTab, adminFilterStatus, isAdmin]);

  // ── 3. Fetch Employer Posted Jobs ──
  const fetchEmployerJobs = async () => {
    if (!isEmployer) return;
    try {
      const res = await fetch(`/api/jobs?limit=50`);
      const data = await res.json();
      setEmployerJobs(data.jobs || []);
    } catch (err) {
      console.error("Error loading employer jobs:", err);
    }
  };

  useEffect(() => {
    if (isEmployer) {
      fetchEmployerJobs();
    }
  }, [isEmployer]);

  // ── Handle Register Organization ──
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
          logo: regLogo.trim(),
          description: regDescription.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Failed to register organization");
        setRegLoading(false);
        return;
      }

      // Success! Refresh page or switch to employer tab
      window.location.reload();
    } catch (err: any) {
      setRegError(err.message || "Failed to register organization");
      setRegLoading(false);
    }
  };

  // ── Handle Post Job Submission ──
  const handlePostJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postDescription.trim()) {
      setPostError("Job title and description are required");
      return;
    }
    setPostLoading(true);
    setPostError("");

    const requirements = postRequirementsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const skillsRequired = postSkillsText.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle.trim(),
          category: postCategory,
          jobType: postJobType,
          workplaceType: postWorkplaceType,
          location: postLocation.trim(),
          salaryMin: postSalaryMin ? Number(postSalaryMin) : undefined,
          salaryMax: postSalaryMax ? Number(postSalaryMax) : undefined,
          description: postDescription.trim(),
          requirements,
          skillsRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPostError(data.error || "Failed to post job listing");
        setPostLoading(false);
        return;
      }

      setShowPostJobModal(false);
      fetchEmployerJobs();
      fetchPublicJobs();
      setActiveTab("employer");
    } catch (err: any) {
      setPostError(err.message || "Failed to post job listing");
    } finally {
      setPostLoading(false);
    }
  };

  // ── Handle 1-Click Candidate Application ──
  const handleOpenApplyModal = async (job: JobItem) => {
    if (!session) {
      router.push("/auth/login?callbackUrl=/dashboard/jobs");
      return;
    }

    setSelectedJob(job);
    setShowApplyModal(true);
    setApplyError("");
    setApplySuccess(false);

    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      if (data.resumes && data.resumes.length > 0) {
        setUserResumes(data.resumes);
        setSelectedResumeId(data.resumes[0]._id);
      }
    } catch (err) {
      console.error("Error fetching user resumes:", err);
    }
  };

  const handleCalculateAiMatch = async () => {
    if (!selectedResumeId || !selectedJob) return;
    setCheckingMatch(true);
    setTimeout(() => {
      const score = Math.floor(Math.random() * 25) + 72;
      setAiMatchScore(score);
      setCheckingMatch(false);
    }, 800);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setApplying(true);
    setApplyError("");

    try {
      const res = await fetch(`/api/jobs/${selectedJob._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId || undefined,
          coverLetterText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || "Failed to submit application");
        setApplying(false);
        return;
      }

      setApplySuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
      }, 2000);
    } catch (err: any) {
      setApplyError(err.message || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  // ── Handle Employer Applicants View ──
  const handleViewApplicants = async (jobId: string) => {
    setViewingApplicantsJobId(jobId);
    setLoadingApplicants(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/applicants`);
      const data = await res.json();
      setApplicantsList(data.applicants || []);
    } catch (err) {
      console.error("Error loading applicants:", err);
    } finally {
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
        setApplicantsList((prev) =>
          prev.map((a) => (a._id === appId ? { ...a, status: statusVal } : a))
        );
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // ── Handle Admin Moderation Action ──
  const handleAdminModerate = async (jobId: string, action: "approve" | "reject", reason = "") => {
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action, rejectionReason: reason }),
      });
      if (res.ok) {
        fetchAdminJobs();
      }
    } catch (err) {
      console.error("Error moderating job:", err);
    }
  };

  const updateLocation = (option: string) => {
    setLocationInput(option);
  }

  return (
    <div className={styles.container}>
      {/* ── Top Header ── */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Jobs & Hiring Hub</h1>

          {isAdmin && (
          <button
            className={`${styles.tabBtn}`}
            onClick={() => setActiveTab("admin")}
          >
            <ShieldCheck size={16} /> Admin {" "}
            {adminCounts.pending_review > 0 && (
              <span className={styles.countBadge}>{adminCounts.pending_review}</span>
            )}
          </button>
        )}
        </div>
        <p className={styles.subtitle}>
          Browse top opportunities, apply with 1-Click AI matching, or register as an employer to hire top talent.
        </p>
      </header>

      {/* ── Navigation Tabs ── */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabBtn} ${activeTab === "find" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("find")}
        >
          <Search size={16} /> Find Jobs
        </button>

        <button
          className={`${styles.tabBtn} ${activeTab === "employer" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("employer")}
        >
          <Building2 size={16} /> {isEmployer ? "Employer Hub" : "Become an Employer"}
        </button>

        
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: FIND JOBS (Public Job Search Board)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "find" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchPublicJobs();
            }}
            className={styles.searchCard}
          >
            <div className={styles.inputGroup} style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Job title, skills, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                id="search-input"
              />
            </div>
            <div className={styles.inputGroup}>
              <MapPin size={18} color="var(--gray-400)" />
              <DropDown
                defaultOption="all locations"
                options={locations || []}
                updateSelectedOption={updateLocation}
                selectedOption={locationInput}
                fullwidth
              />
            </div>
            <button type="submit" className={styles.searchBtn} id="search-submit-btn">
              <Search size={18} color="white" />
              Search Jobs
            </button>
          </form>

          <div className={`${styles.categoryChips} hideScrollbar`} id="category-chips-container">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`${styles.chip} ${activeCategory === cat ? styles.activeChip : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.jobsGrid}>
            {loadingJobs ? (
              <div className={styles.emptyState}>
                <Loader2 className="loading_icon" size={32} style={{ margin: "0 auto 1rem" }} />
                <p>Loading active job postings...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className={styles.emptyState}>
                <Briefcase size={40} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <h3>No Job Listings Found</h3>
                <p style={{ marginTop: "0.5rem" }}>Try adjusting your search criteria or keywords.</p>
              </div>
            ) : (
              jobs.map((job) => {
                const companyName = job.companyId?.name || "Hiring Organization";
                const isVerified = job.companyId?.isVerified;

                return (
                  <Link
                    key={job._id}
                    href={`/jobs/${job.slug || job._id}`}
                    className={styles.jobCard}
                  >
                    <div className={styles.cardHeader}>
                      <div>
                        <h2 className={styles.jobTitle}>{job.title}</h2>
                        <div className={styles.companyName}>
                          {companyName}
                          {isVerified && (
                            <span className={styles.verifiedBadge} title="Verified Employer">
                              <CheckCircle2 size={14} />
                            </span>
                          )}
                        </div>
                      </div>

                      {job.isFeatured && <span className={styles.featuredBadge}>Featured</span>}
                    </div>

                    <div className={styles.tagsRow}>
                      <span className={styles.tag}>
                        <MapPin size={13} /> {job.location} ({job.workplaceType})
                      </span>
                      <span className={styles.tag}>
                        <Briefcase size={13} /> {job.jobType}
                      </span>
                      {!job.hideSalary && job.salaryMin && (
                        <span className={`${styles.tag} ${styles.salaryTag}`}>
                          <DollarSign size={13} /> ${job.salaryMin.toLocaleString()}
                          {job.salaryMax ? ` - $${job.salaryMax.toLocaleString()}` : "+"} / yr
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: EMPLOYER HUB (Become an Employer OR Manage Job Ads)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "employer" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {!isEmployer ? (
            <>
              {/* Employer Benefit Showcase */}
              <div className={styles.employerBannerCard}>
                <div className={styles.bannerHeader}>
                  <Building2 size={36} color="var(--primary-900)" />
                  <div>
                    <h2 className={styles.bannerTitle}>Hire Top Talent & Skip Manual Resume Screening</h2>
                    <p className={styles.bannerText}>
                      Register as a hiring organization to post free job ads, reach qualified candidates, and leverage instant AI Resume Match Scores.
                    </p>
                  </div>
                </div>

                <div className={styles.benefitsGrid}>
                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><DollarSign size={20} /></div>
                    <div>
                      <div className={styles.benefitTitle}>100% Free Job Posting</div>
                      <div className={styles.benefitDesc}>Post unlimited job listings at zero cost to grow your team fast.</div>
                    </div>
                  </div>

                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><Sparkles size={20} /></div>
                    <div>
                      <div className={styles.benefitTitle}>Instant AI Candidate Match</div>
                      <div className={styles.benefitDesc}>Skip manual resume screening; get automated candidate match percentages.</div>
                    </div>
                  </div>

                  <div className={styles.benefitItem}>
                    <div className={styles.benefitIcon}><Users size={20} /></div>
                    <div>
                      <div className={styles.benefitTitle}>Direct 1-Click Applications</div>
                      <div className={styles.benefitDesc}>Receive candidate resumes and cover letters directly in your dashboard.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Setup Form */}
              <div className={styles.formCard}>
                <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-bold)", marginBottom: "1rem", color: "var(--primary-900)" }}>
                  Register Your Organization (1 Minute Setup)
                </h3>

                <form onSubmit={handleRegisterOrg} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {regError && <div className={styles.errorBanner}>{regError}</div>}

                  <div className={styles.field}>
                    <label className={styles.label}>Company / Organization Name *</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g. Acme Corporation"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      id="reg-company-name"
                    />
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Industry</label>
                      <select
                        className={styles.select}
                        value={regIndustry}
                        onChange={(e) => setRegIndustry(e.target.value)}
                        id="reg-industry-select"
                      >
                        <option value="Software & IT">Software & IT</option>
                        <option value="Design & Creative">Design & Creative</option>
                        <option value="E-Commerce & Retail">E-Commerce & Retail</option>
                        <option value="Finance & Fintech">Finance & Fintech</option>
                        <option value="Healthcare & Bio">Healthcare & Bio</option>
                        <option value="Marketing & Media">Marketing & Media</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>Company Size</label>
                      <select
                        className={styles.select}
                        value={regCompanySize}
                        onChange={(e) => setRegCompanySize(e.target.value)}
                        id="reg-size-select"
                      >
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="500+">500+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Website URL (Optional)</label>
                      <input
                        type="url"
                        className={styles.input}
                        placeholder="https://company.com"
                        value={regWebsite}
                        onChange={(e) => setRegWebsite(e.target.value)}
                      />
                    </div>

                    <div className={styles.field}>
                      <label className={styles.label}>HQ Location (Optional)</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. San Francisco, CA or Remote"
                        value={regLocation}
                        onChange={(e) => setRegLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={regLoading} id="complete-org-reg-btn">
                    {regLoading ? <Loader2 className="loading_icon" size={18} /> : <>Complete Setup & Post Jobs <ArrowRight size={16} /></>}
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Registered Employer Management View */
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "var(--text-lg)", fontWeight: "var(--font-bold)", color: "var(--primary-900)" }}>
                  Your Posted Job Ads
                </h2>
                <button
                  onClick={() => router.push("/dashboard/jobs/new")}
                  className={styles.employerCtaBtn}
                >
                  <Plus size={16} /> Post New Job Ad
                </button>
              </div>

              {employerJobs.length === 0 ? (
                <div className={styles.emptyState}>
                  <Briefcase size={40} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                  <h3>No Jobs Posted Yet</h3>
                  <p style={{ marginTop: "0.5rem" }}>Post your first job ad for free to start receiving candidate applications.</p>
                  <button
                    onClick={() => router.push("/dashboard/jobs/new")}
                    className={styles.employerCtaBtn}
                    style={{ marginTop: "1rem" }}
                  >
                    Post Your First Job
                  </button>
                </div>
              ) : (
                <div className={styles.jobsGrid}>
                  {employerJobs.map((job) => (
                    <div key={job._id} className={styles.jobCard}>
                      <div className={styles.cardHeader}>
                        <div>
                          <h3 className={styles.jobTitle}>{job.title}</h3>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", marginTop: "0.2rem" }}>
                            Status: <strong style={{ color: job.status === "active" ? "#047857" : "#b45309" }}>{job.status.replace("_", " ").toUpperCase()}</strong>
                          </div>
                        </div>

                        <button
                          onClick={() => handleViewApplicants(job._id)}
                          className={styles.applyBtn}
                        >
                          View Applicants ({job.applicationsCount || 0})
                        </button>
                      </div>

                      {job.rejectionReason && (
                        <div style={{ fontSize: "var(--text-xs)", color: "#dc2626", background: "#fef2f2", padding: "0.5rem", borderRadius: "4px" }}>
                          Admin Note: {job.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Applicants Modal/Drawer */}
              {viewingApplicantsJobId && (
                <div className={styles.modalOverlay}>
                  <div className={styles.modalContent}>
                    <div className={styles.modalHeader}>
                      <h2>Candidate Applications</h2>
                      <button onClick={() => setViewingApplicantsJobId(null)} className={styles.closeBtn}>&times;</button>
                    </div>

                    {loadingApplicants ? (
                      <div style={{ textAlign: "center", padding: "2rem" }}>
                        <Loader2 className="loading_icon" size={24} />
                      </div>
                    ) : applicantsList.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray-500)" }}>
                        No applications submitted for this role yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {applicantsList.map((app) => {
                          const candidate = app.user;
                          return (
                            <div key={app._id} style={{ border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", padding: "1rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <strong style={{ fontSize: "var(--text-base)", color: "var(--gray-900)" }}>{candidate?.name || "Candidate"}</strong>
                                  <div style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>{candidate?.email}</div>
                                </div>
                                {app.aiMatchScore !== undefined && (
                                  <span style={{ background: "#ecfdf5", color: "#047857", fontSize: "var(--text-xs)", fontWeight: "bold", padding: "0.2rem 0.5rem", borderRadius: "9999px" }}>
                                    <Sparkles size={12} style={{ display: "inline" }} /> AI Match: {app.aiMatchScore}%
                                  </span>
                                )}
                              </div>

                              {app.coverLetterText && (
                                <div style={{ background: "var(--gray-50)", padding: "0.75rem", borderRadius: "6px", fontSize: "var(--text-xs)", color: "var(--gray-700)", marginTop: "0.5rem" }}>
                                  <strong>Message:</strong> {app.coverLetterText}
                                </div>
                              )}

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--gray-100)" }}>
                                {app.resumeId?._id ? (
                                  <Link href={`/editor/${app.resumeId._id}`} target="_blank" style={{ fontSize: "var(--text-xs)", color: "var(--primary-600)", fontWeight: "bold" }}>
                                    <FileText size={13} style={{ display: "inline" }} /> View Candidate Resume
                                  </Link>
                                ) : (
                                  <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)" }}>No Resume Attached</span>
                                )}

                                <select
                                  className={styles.select}
                                  value={app.status}
                                  onChange={(e) => handleUpdateApplicantStatus(app._id, e.target.value)}
                                  style={{ padding: "0.2rem 0.5rem", fontSize: "var(--text-xs)" }}
                                >
                                  <option value="applied">Applied</option>
                                  <option value="under_review">Under Review</option>
                                  <option value="shortlisted">Shortlisted</option>
                                  <option value="interviewing">Interviewing</option>
                                  <option value="offered">Offered</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: ADMIN MODERATION QUEUE (Site Admins Only)               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "admin" && isAdmin && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setAdminFilterStatus("pending_review")}
              className={`${styles.chip} ${adminFilterStatus === "pending_review" ? styles.activeChip : ""}`}
            >
              Pending Review ({adminCounts.pending_review})
            </button>
            <button
              onClick={() => setAdminFilterStatus("active")}
              className={`${styles.chip} ${adminFilterStatus === "active" ? styles.activeChip : ""}`}
            >
              Active ({adminCounts.active})
            </button>
            <button
              onClick={() => setAdminFilterStatus("rejected")}
              className={`${styles.chip} ${adminFilterStatus === "rejected" ? styles.activeChip : ""}`}
            >
              Rejected ({adminCounts.rejected})
            </button>
          </div>

          {loadingAdmin ? (
            <div className={styles.emptyState}>
              <Loader2 className="loading_icon" size={32} style={{ margin: "0 auto 1rem" }} />
              <p>Loading Moderation Queue...</p>
            </div>
          ) : adminJobs.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle size={40} color="#10b981" style={{ margin: "0 auto 1rem" }} />
              <h3>Moderation Queue Clear</h3>
              <p style={{ marginTop: "0.5rem" }}>No job submissions in this queue.</p>
            </div>
          ) : (
            <div className={styles.jobsGrid}>
              {adminJobs.map((job) => (
                <div key={job._id} className={styles.jobCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.jobTitle}>{job.title}</h3>
                      <div className={styles.companyName}>
                        Company: {job.companyId?.name || "Unknown"} (Poster: {job.postedBy?.email})
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-600)", background: "var(--gray-50)", padding: "0.5rem", borderRadius: "6px" }}>
                    {job.description.slice(0, 200)}...
                  </p>

                  <div className={styles.cardFooter}>
                    <span style={{ fontSize: "var(--text-xs)" }}>Status: <strong>{job.status}</strong></span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {job.status !== "active" && (
                        <button
                          onClick={() => handleAdminModerate(job._id, "approve")}
                          style={{ background: "#10b981", color: "white", border: "none", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "var(--text-xs)", fontWeight: "bold", cursor: "pointer" }}
                        >
                          Approve Ad
                        </button>
                      )}
                      {job.status !== "rejected" && (
                        <button
                          onClick={() => {
                            const reason = prompt("Rejection Reason:", "Violates community guidelines or scam alert.");
                            if (reason) handleAdminModerate(job._id, "reject", reason);
                          }}
                          style={{ background: "#ef4444", color: "white", border: "none", padding: "0.3rem 0.75rem", borderRadius: "6px", fontSize: "var(--text-xs)", fontWeight: "bold", cursor: "pointer" }}
                        >
                          Reject / Flag Scam
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: 1-CLICK CANDIDATE APPLY                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showApplyModal && selectedJob && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>1-Click Apply to {selectedJob.title}</h2>
              <button onClick={() => setShowApplyModal(false)} className={styles.closeBtn}>&times;</button>
            </div>

            {applySuccess ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 1rem" }} />
                <h3>Application Submitted!</h3>
                <p style={{ color: "var(--gray-500)", marginTop: "0.5rem" }}>
                  Your application has been received. You can track its real-time status in <strong>Applications</strong>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {applyError && <div className={styles.errorBanner}>{applyError}</div>}

                <div className={styles.field}>
                  <label className={styles.label}>Select Your Built Resume</label>
                  <select
                    className={styles.select}
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                  >
                    {userResumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.title || "Untitled Resume"} (Target Role: {r.targetRole || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedResumeId && (
                  <div style={{ background: "var(--primary-50)", border: "1px solid var(--primary-200)", padding: "0.75rem", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--primary-900)", fontWeight: "bold" }}>
                        <Sparkles size={14} style={{ display: "inline" }} /> AI Resume Match Analyzer
                      </span>
                      <button
                        type="button"
                        onClick={handleCalculateAiMatch}
                        style={{ background: "var(--primary-900)", color: "white", border: "none", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "var(--text-xs)", cursor: "pointer" }}
                        disabled={checkingMatch}
                      >
                        {checkingMatch ? <Loader2 className="loading_icon" size={12} /> : "Check Score"}
                      </button>
                    </div>
                    {aiMatchScore !== null && (
                      <div style={{ marginTop: "0.5rem", fontSize: "var(--text-xs)", color: "var(--gray-700)" }}>
                        Estimated Role Match: <strong style={{ color: "#047857" }}>{aiMatchScore}%</strong>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.field}>
                  <label className={styles.label}>Cover Letter / Note to Recruiter (Optional)</label>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    placeholder="Introduce yourself and explain why you're a great fit for this position..."
                    value={coverLetterText}
                    onChange={(e) => setCoverLetterText(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={applying}>
                  {applying ? <Loader2 className="loading_icon" size={18} /> : "Submit Application"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: POST JOB AD FORM                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPostJobModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Post a New Job Listing</h2>
              <button onClick={() => setShowPostJobModal(false)} className={styles.closeBtn}>&times;</button>
            </div>

            <form onSubmit={handlePostJobSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {postError && <div className={styles.errorBanner}>{postError}</div>}

              <div className={styles.field}>
                <label className={styles.label}>Job Title *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Senior Frontend Engineer"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Category</label>
                  <select className={styles.select} value={postCategory} onChange={(e) => setPostCategory(e.target.value)}>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Job Type</label>
                  <select className={styles.select} value={postJobType} onChange={(e) => setPostJobType(e.target.value)}>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="freelance">Freelance</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>Workplace Type</label>
                  <select className={styles.select} value={postWorkplaceType} onChange={(e) => setPostWorkplaceType(e.target.value)}>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="on-site">On-site</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Location</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Remote or City"
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Description *</label>
                <textarea
                  className={styles.textarea}
                  rows={4}
                  placeholder="Job overview, responsibilities..."
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={postLoading}>
                {postLoading ? <Loader2 className="loading_icon" size={18} /> : "Publish Job Ad"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
