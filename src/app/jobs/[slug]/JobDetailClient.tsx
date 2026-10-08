"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Link2,
  MapPin,
  Share2,
  Send,
  Check,
} from "lucide-react";
import detailStyles from "./jobDetail.module.css";
import { buildJobShareText } from "@/utils/buildJobShareText";
import JobApplicationModal from "@/components/jobs/job-application/JobApplicationModal";
import OnboardingOverlay from "@/components/onboarding/OnboardingOverlay/OnboardingOverlay";
import { useAlertStore } from "@/store/useAlertStore";
import type { DraftApplicationData } from "@/types/DraftApplicationData";

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

type ApplicationType = "on_platform" | "external_link" | "email";
type ScreeningQuestionType = "text" | "textarea" | "dropdown" | "checkbox";

interface ScreeningQuestion {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  options?: string[];
  required: boolean;
}

interface JobDetail {
  _id: string;
  title: string;
  slug: string;
  companyId: JobCompany;
  jobType: string;
  workplaceType: string;
  location: string;
  category: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  salaryPeriod?: string;
  hideSalary: boolean;
  description: string;
  requirements: string[];
  benefits: string[];
  skillsRequired: string[];
  screeningQuestions?: ScreeningQuestion[];
  applicationType: ApplicationType;
  externalUrl?: string;
  contactEmail?: string;
  isFeatured: boolean;
  createdAt: string;
  summary?: string;
}

const hasHtmlTags = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

export default function JobDetailClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const isSignedIn = !!session;
  const isAdmin = Boolean(session?.user?.isAdmin);

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [alreadyAppliedStatus, setAlreadyAppliedStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftApplicationData | null>(null);
  const draftAlertFiredRef = useRef(false);

  const handleOpenApplyModal = () => {
    setShowApplyModal(true);
    if (job?._id) {
      const storageKey = `application_started_${job._id}`;
      try {
        if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, "1");
      } catch {}
      fetch("/api/activities/track-started", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job._id }),
      }).catch(() => {});
    }
  };

  const fetchJobDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${slug}`);
      const data = await res.json();
      if (!res.ok || !data.job) {
        setError(data.error || "Job ad not found");
        return;
      }
      setJob(data.job);
      setAlreadyApplied(Boolean(data.alreadyApplied));
      setAlreadyAppliedStatus(typeof data.applicationStatus === "string" ? data.applicationStatus : null);
      setDraft(data.draft ?? null);
      if (typeof document !== "undefined" && data.job?.title) {
        document.title = data.job.title;
      }
    } catch {
      setError("Failed to load job details");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchJobDetail();
  }, [fetchJobDetail]);

  useEffect(() => {
    if (job && draft && isSignedIn && !draftAlertFiredRef.current) {
      draftAlertFiredRef.current = true;
      useAlertStore.getState().addAlert(
        "info",
        "You have an unfinished application for this job — select Continue Application to pick up where you left off."
      );
    }
  }, [job, draft, isSignedIn]);

  // Keep document.title in sync when job loads (social share title in tab)
  useEffect(() => {
    if (job?.title && typeof document !== "undefined") {
      document.title = job.title;
    }
  }, [job?.title]);

  const canonicalPath = `/jobs/${job?.slug || slug}`;
  const shortPath = useMemo(() => (job?._id ? `/jobs/${job._id}` : canonicalPath), [job?._id, canonicalPath]);
  const shortUrl = useMemo(() => {
    if (typeof window === "undefined") return shortPath;
    return `${window.location.origin}${shortPath}`;
  }, [shortPath]);

  const descriptionHtml = useMemo(() => {
    if (!job?.description) return "";
    return hasHtmlTags(job.description) ? job.description : job.description.replace(/\n/g, "<br/>");
  }, [job?.description]);

  const signInUrl = `/auth/login?callbackUrl=${encodeURIComponent(shortPath)}`;

  const copyJobLink = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (!job) return;
    const shareText = buildJobShareText(
      {
        title: job.title,
        companyName: job.companyId?.name,
        location: job.location,
        jobType: job.jobType,
        workplaceType: job.workplaceType,
        description: job.description,
        requirements: job.requirements,
        skillsRequired: job.skillsRequired,
        benefits: job.benefits,
      },
      shortUrl
    );
    if (navigator.share) {
      try {
        await navigator.share({
          title: job.title,
          text: shareText,
          url: shortUrl,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShareToX = () => {
    if (!job) return;
    const summaryText = (job.summary || "").trim();
    const callToAction = `Apply now 👇\n${shortUrl}`;
    let tweetText = callToAction;
    if (summaryText) {
      const suffix = `\n\n${callToAction}`;
      const maxSummaryLen = 280 - suffix.length;
      const tweetSummary =
        summaryText.length > maxSummaryLen
          ? summaryText.slice(0, Math.max(0, maxSummaryLen - 1)).trimEnd() + "…"
          : summaryText;
      tweetText = `${tweetSummary}${suffix}`;
    }
    const encoded = encodeURIComponent(tweetText);
    window.open(`https://twitter.com/intent/tweet?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  if (loading || status === "loading") {
    return (
      <div className={detailStyles.container}>
        <div className={detailStyles.wrapper}>
          <JobDetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={detailStyles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Job Not Found</h2>
        <p>{error || "This job listing may have expired or been removed."}</p>
        <button onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push(isSignedIn ? "/dashboard/jobs" : "/jobs"))} className={detailStyles.backBtn}>
          <ArrowLeft size={16} /> Back to Job Board
        </button>
      </div>
    );
  }

  const company = job.companyId;
  const salaryPeriod = job.salaryPeriod === "hourly" ? "hr" : job.salaryPeriod === "monthly" ? "mo" : "yr";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(isSignedIn ? "/dashboard/jobs" : "/jobs");
  };

  return (
    <div className={detailStyles.container}>
      <div className={detailStyles.wrapper}>
        <button onClick={handleBack} className={detailStyles.backLink} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={16} /> Back to Job Search
        </button>

        <header className={detailStyles.headerCard}>
          <div className={detailStyles.headerMain}>
            <div>
              <div className={detailStyles.companyTitleRow}>
                <span className={detailStyles.companyName}>{company?.name}</span>
                {company?.isVerified && (
                  <span className={detailStyles.verifiedTag} title="Verified Organization">
                    <CheckCircle2 size={14} /> Verified
                  </span>
                )}
              </div>
              <h1 className={detailStyles.title}>{job.title}</h1>
              <div className={detailStyles.metaRow}>
                <span><MapPin size={15} /> {job.location} ({job.workplaceType})</span>
                <span><Briefcase size={15} /> {job.jobType}</span>
                <span><Clock size={15} /> Posted {new Date(job.createdAt).toLocaleDateString()}</span>
              </div>

              {!job.hideSalary && job.salaryMin && (
              <div className={detailStyles.salaryBox}>
                <span className={detailStyles.salaryLabel}>Salary Range</span>
                <span className={detailStyles.salaryValue}>
                  {job.salaryCurrency || "USD"} {job.salaryMin.toLocaleString()}
                  {job.salaryMax ? ` - ${job.salaryCurrency || "USD"} ${job.salaryMax.toLocaleString()}` : "+"} / {salaryPeriod}
                </span>
              </div>
            )}
            </div>
          </div>

          <div className={detailStyles.headerActions}>
            <div className={detailStyles.shareActions}>
              <button type="button" onClick={handleShare} className={detailStyles.secondaryAction}>
                <Share2 size={16} /> Share
              </button>
              <button type="button" onClick={copyJobLink} className={detailStyles.secondaryAction}>
                {copied ? <Check size={16} /> : <Link2 size={16} />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button
                type="button"
                onClick={handleShareToX}
                className={`${detailStyles.secondaryAction} ${detailStyles.xShareAction}`}
                aria-label="Share to X"
              >
                <XLogo size={16} />
              </button>
            </div>

            {!isSignedIn ? (
              <Link href={signInUrl} className={detailStyles.applyBtn} id="sign-in-to-apply-btn">
                Sign In to Apply <Send size={16} />
              </Link>
            ) : alreadyApplied ? (
              <>
                <button disabled className={detailStyles.applyBtn} style={{ opacity: 0.6, cursor: "not-allowed" }}>
                  Applied <Check size={16} />
                </button>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", marginTop: "0.25rem", textAlign: "right" }}>
                  You already applied to this job{alreadyAppliedStatus ? ` — ${alreadyAppliedStatus.replace("_", " ")}` : ""}.
                </span>
              </>
            ) : draft ? (
              <button onClick={handleOpenApplyModal} className={detailStyles.applyBtn} id="continue-apply-modal-btn">
                Continue Application <Send size={16} />
              </button>
            ) : (
              <button onClick={handleOpenApplyModal} className={detailStyles.applyBtn} id="open-apply-modal-btn">
                Apply Now <Send size={16} />
              </button>
            )}
          </div>
        </header>

        <div className={detailStyles.bodyGrid}>
          <main className={detailStyles.mainContent}>
            {isAdmin && (
              <img
                src={`/api/og/job?slug=${encodeURIComponent(slug)}`}
                width="100%"
                alt="Job share card preview"
                className={detailStyles.ogPreview}
              />
            )}
            <section className={detailStyles.section}>
              <h2 className={detailStyles.sectionTitle}>Job Description</h2>
              <div className={detailStyles.descriptionText} dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            </section>

            {job.requirements && job.requirements.length > 0 && (
              <section className={detailStyles.section}>
                <h2 className={detailStyles.sectionTitle}>Requirements & Qualifications</h2>
                <ul className={detailStyles.bulletsList}>{job.requirements.map((req, i) => <li key={i}>{req}</li>)}</ul>
              </section>
            )}

            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <section className={detailStyles.section}>
                <h2 className={detailStyles.sectionTitle}>Required Skills</h2>
                <div className={detailStyles.skillsRow}>{job.skillsRequired.map((skill, i) => <span key={i} className={detailStyles.skillBadge}>{skill}</span>)}</div>
              </section>
            )}

            {job.benefits && job.benefits.length > 0 && (
              <section className={detailStyles.section}>
                <h2 className={detailStyles.sectionTitle}>Perks & Benefits</h2>
                <ul className={detailStyles.bulletsList}>{job.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </section>
            )}

            <section className={detailStyles.section} style={{ textAlign: "center" }}>
              {!isSignedIn ? (
                <Link href={signInUrl} className={detailStyles.applyBtn} style={{ margin: "0 auto" }}>
                  Sign In to Apply <Send size={16} />
                </Link>
              ) : alreadyApplied ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <button disabled className={detailStyles.applyBtn} style={{ opacity: 0.6, cursor: "not-allowed", margin: "0 auto" }}>
                    Applied <Check size={16} />
                  </button>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)" }}>You already applied to this job{alreadyAppliedStatus ? ` — ${alreadyAppliedStatus.replace("_", " ")}` : ""}.</span>
                </div>
              ) : draft ? (
                <button onClick={handleOpenApplyModal} className={detailStyles.applyBtn} style={{ margin: "0 auto" }}>
                  Continue Application <Send size={16} />
                </button>
              ) : (
                <button onClick={handleOpenApplyModal} className={detailStyles.applyBtn} style={{ margin: "0 auto" }}>
                  Apply Now <Send size={16} />
                </button>
              )}
            </section>
          </main>

          <aside className={detailStyles.sidebar}>
            <div className={detailStyles.companyCard}>
              <h3 className={detailStyles.cardTitle}>About {company?.name}</h3>
              {company?.description && <p className={detailStyles.companyDesc}>{company.description}</p>}
              <div className={detailStyles.companyMetaList}>
                {company?.industry && <div><strong>Industry:</strong> {company.industry}</div>}
                {company?.location && <div><strong>HQ Location:</strong> {company.location}</div>}
                {company?.website && <div><strong>Website:</strong> <a href={company.website} target="_blank" rel="noreferrer" className={detailStyles.inlineLink}>{company.website.replace(/^https?:\/\//, "")}</a></div>}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showApplyModal && (
        <JobApplicationModal
          job={job}
          open={showApplyModal}
          onClose={() => {
            setShowApplyModal(false);
            void fetchJobDetail();
          }}
          draft={draft}
        />
      )}
      {!showApplyModal && <OnboardingOverlay />}
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <>
      <div className={detailStyles.skeletonBackLink} />
      <div className={detailStyles.skeletonHeaderCard}>
        <div className={detailStyles.skeletonHeaderLeft}>
          <div className={detailStyles.skeletonCompanyRow}>
            <div className={detailStyles.skeletonCompanyName} />
            <div className={detailStyles.skeletonVerified} />
          </div>
          <div className={detailStyles.skeletonTitle} />
          <div className={detailStyles.skeletonMetaRow}>
            <div className={detailStyles.skeletonMeta} />
            <div className={detailStyles.skeletonMeta} />
            <div className={detailStyles.skeletonMeta} />
          </div>
          <div className={`${detailStyles.skeletonSalaryBox} ${detailStyles.skeletonSalaryBoxLeft}`}>
            <div className={detailStyles.skeletonSalaryLabel} />
            <div className={detailStyles.skeletonSalaryValue} />
          </div>
        </div>
        <div className={detailStyles.skeletonHeaderActionsCol}>
          <div className={detailStyles.skeletonShareRow}>
            <div className={detailStyles.skeletonShareBtn} />
            <div className={detailStyles.skeletonShareBtn} />
          </div>
          <div className={detailStyles.skeletonApplyBtn} />
        </div>
      </div>
      <div className={detailStyles.skeletonBodyGrid}>
        <div className={detailStyles.skeletonMainContent}>
          <div className={detailStyles.skeletonSectionTitle} />
          <div className={detailStyles.skeletonParagraph}>
            <div className={detailStyles.skeletonLine} />
            <div className={detailStyles.skeletonLine} />
            <div className={detailStyles.skeletonLine} />
            <div className={`${detailStyles.skeletonLine} ${detailStyles.skeletonLineShort}`} />
          </div>
          <div className={detailStyles.skeletonSectionTitle} />
          <div className={detailStyles.skeletonParagraph}>
            <div className={detailStyles.skeletonLine} />
            <div className={detailStyles.skeletonLine} />
            <div className={`${detailStyles.skeletonLine} ${detailStyles.skeletonLineShort}`} />
          </div>
          <div className={detailStyles.skeletonSectionTitle} />
          <div className={detailStyles.skeletonSkillsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={detailStyles.skeletonSkill} />
            ))}
          </div>
        </div>
        <div className={detailStyles.skeletonCompanyCard}>
          <div className={detailStyles.skeletonCompanyTitle} />
          <div className={detailStyles.skeletonParagraph}>
            <div className={detailStyles.skeletonLine} />
            <div className={detailStyles.skeletonLine} />
            <div className={`${detailStyles.skeletonLine} ${detailStyles.skeletonLineShort}`} />
          </div>
          <div className={detailStyles.skeletonParagraph}>
            <div className={detailStyles.skeletonLine} />
            <div className={detailStyles.skeletonLine} />
          </div>
        </div>
      </div>
    </>
  );
}

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}
