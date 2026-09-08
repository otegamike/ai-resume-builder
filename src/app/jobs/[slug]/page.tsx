"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Share2,
  Send,
  Check,
} from "lucide-react";
import detailStyles from "./jobDetail.module.css";
import JobApplicationModal from "@/components/jobs/job-application/JobApplicationModal";

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
}

const hasHtmlTags = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

export default function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    const fetchJobDetail = async () => {
      try {
        const res = await fetch(`/api/jobs/${slug}`);
        const data = await res.json();
        if (!res.ok || !data.job) {
          setError(data.error || "Job ad not found");
          return;
        }
        setJob(data.job);
      } catch {
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    };
    fetchJobDetail();
  }, [slug]);

  const canonicalPath = `/jobs/${job?.slug || slug}`;
  const canonicalUrl = useMemo(() => {
    if (typeof window === "undefined") return canonicalPath;
    return `${window.location.origin}${canonicalPath}`;
  }, [canonicalPath]);

  const descriptionHtml = useMemo(() => {
    if (!job?.description) return "";
    return hasHtmlTags(job.description) ? job.description : job.description.replace(/\n/g, "<br/>");
  }, [job?.description]);

  const signInUrl = `/auth/login?callbackUrl=${encodeURIComponent(canonicalPath)}`;

  const copyJobLink = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (!job) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${job.title} at ${job.companyId?.name || "Hiring Organization"}`,
          text: `View this ${job.title} role on Resumy AI.`,
          url: canonicalUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }
    await copyJobLink();
  };



  if (loading || status === "loading") {
    return (
      <div className={detailStyles.loadingContainer}>
        <Loader2 size={36} />
        <p>Loading job details...</p>
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
  const isSignedIn = !!session;
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
            </div>
          </div>

          <div className={detailStyles.headerActions}>
            {!job.hideSalary && job.salaryMin && (
              <div className={detailStyles.salaryBox}>
                <span className={detailStyles.salaryLabel}>Salary Range</span>
                <span className={detailStyles.salaryValue}>
                  {job.salaryCurrency || "USD"} {job.salaryMin.toLocaleString()}
                  {job.salaryMax ? ` - ${job.salaryCurrency || "USD"} ${job.salaryMax.toLocaleString()}` : "+"} / {salaryPeriod}
                </span>
              </div>
            )}

            <div className={detailStyles.shareActions}>
              <button type="button" onClick={handleShare} className={detailStyles.secondaryAction}>
                <Share2 size={16} /> Share
              </button>
              <button type="button" onClick={copyJobLink} className={detailStyles.secondaryAction}>
                {copied ? <Check size={16} /> : <Link2 size={16} />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>

            {!isSignedIn ? (
              <Link href={signInUrl} className={detailStyles.applyBtn} id="sign-in-to-apply-btn">
                Sign In to Apply <Send size={16} />
              </Link>
            ) : (
              <button onClick={() => setShowApplyModal(true)} className={detailStyles.applyBtn} id="open-apply-modal-btn">
                Apply Now <Send size={16} />
              </button>
            )}
          </div>
        </header>

        <div className={detailStyles.bodyGrid}>
          <main className={detailStyles.mainContent}>
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
              ) : (
                <button onClick={() => setShowApplyModal(true)} className={detailStyles.applyBtn} style={{ margin: "0 auto" }}>
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

      {showApplyModal && <JobApplicationModal job={job} open={showApplyModal} onClose={() => setShowApplyModal(false)} />}
    </div>
  );
}
