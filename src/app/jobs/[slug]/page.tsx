"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MapPin,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import styles from "../jobs.module.css";
import detailStyles from "./jobDetail.module.css";

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
  const [userResumes, setUserResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [coverLetterText, setCoverLetterText] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [offPlatformSubmitting, setOffPlatformSubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [offPlatformSuccess, setOffPlatformSuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  const [aiMatchScore, setAiMatchScore] = useState<number | null>(null);
  const [checkingMatch, setCheckingMatch] = useState(false);

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
      } catch (err) {
        console.error("Error loading job details:", err);
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
    return hasHtmlTags(job.description)
      ? job.description
      : job.description.replace(/\n/g, "<br/>");
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

  const handleOpenApplyModal = async () => {
    if (!job) return;
    if (!session) {
      router.push(signInUrl);
      return;
    }

    setShowApplyModal(true);
    setApplyError("");
    setApplySuccess(false);

    try {
      const res = await fetch("/api/resumes");
      const data = await res.json();
      const resumes = data.resumes || [];
      setUserResumes(resumes);
      if (resumes.length > 0) {
        setSelectedResumeId(resumes[0]._id);
      }
    } catch (err) {
      console.error("Error fetching user resumes:", err);
    }
  };

  const handleCalculateAiMatch = async () => {
    if (!selectedResumeId || !job) return;
    setCheckingMatch(true);
    setTimeout(() => {
      const randomScore = Math.floor(Math.random() * 25) + 72;
      setAiMatchScore(randomScore);
      setCheckingMatch(false);
    }, 900);
  };

  const setScreeningAnswer = (questionId: string, value: string) => {
    setScreeningAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const buildScreeningAnswers = () =>
    (job?.screeningQuestions || []).map((question) => ({
      questionId: question.id,
      question: question.question,
      answer: screeningAnswers[question.id] || "",
    }));

  const validateRequiredScreeningAnswers = () => {
    const missingQuestion = (job?.screeningQuestions || []).find(
      (question) => question.required && !screeningAnswers[question.id]?.trim()
    );

    if (missingQuestion) {
      setApplyError(`Please answer: ${missingQuestion.question}`);
      return false;
    }

    return true;
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !validateRequiredScreeningAnswers()) return;

    setSubmitting(true);
    setApplyError("");

    try {
      const res = await fetch(`/api/jobs/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId || undefined,
          coverLetterText: coverLetterText || undefined,
          screeningAnswers: buildScreeningAnswers(),
          source: "platform",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApplyError(data.error || "Failed to submit application");
        return;
      }

      setApplySuccess(true);
      setTimeout(() => {
        setShowApplyModal(false);
        setApplySuccess(false);
      }, 2500);
    } catch (err: any) {
      setApplyError(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmOffPlatformApplication = async () => {
    if (!job) return;
    setOffPlatformSubmitting(true);
    setApplyError("");

    try {
      const res = await fetch(`/api/jobs/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "off_platform" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || "Failed to confirm your application");
        return;
      }

      setOffPlatformSuccess(true);
    } catch (err: any) {
      setApplyError(err.message || "Failed to confirm your application");
    } finally {
      setOffPlatformSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className={detailStyles.loadingContainer}>
        <Loader2 className="loading_icon" size={36} />
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
        <Link href="/jobs" className={detailStyles.backBtn}>
          <ArrowLeft size={16} /> Back to Job Board
        </Link>
      </div>
    );
  }

  const company = job.companyId;
  const isSignedIn = !!session;
  const salaryPeriod = job.salaryPeriod === "hourly" ? "hr" : job.salaryPeriod === "monthly" ? "mo" : "yr";

  return (
    <div className={styles.container}>
      <div className={detailStyles.wrapper}>
        <Link href="/jobs" className={detailStyles.backLink}>
          <ArrowLeft size={16} /> Back to Job Search
        </Link>

        <header className={detailStyles.headerCard}>
          <div className={detailStyles.headerMain}>
            <div>
              <div className={detailStyles.companyTitleRow}>
                <span className={detailStyles.companyName}>{company?.name}</span>
                {company?.isVerified && (
                  <span className={detailStyles.verifiedTag} title="Verified Organization">
                    <CheckCircle2 size={16} /> Verified
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
                Sign In to Apply <Sparkles size={16} />
              </Link>
            ) : job.applicationType === "external_link" && job.externalUrl ? (
              <a
                href={job.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={detailStyles.applyBtn}
              >
                Apply on Company Site <ExternalLink size={16} />
              </a>
            ) : job.applicationType === "email" ? (
              <a href="#how-to-apply" className={detailStyles.applyBtn}>
                How to Apply <Mail size={16} />
              </a>
            ) : (
              <button onClick={handleOpenApplyModal} className={detailStyles.applyBtn} id="open-apply-modal-btn">
                1-Click Apply Now <Sparkles size={16} />
              </button>
            )}
          </div>
        </header>

        <div className={detailStyles.bodyGrid}>
          <main className={detailStyles.mainContent}>
            <section className={detailStyles.section}>
              <h2 className={detailStyles.sectionTitle}>Job Description</h2>
              <div
                className={detailStyles.descriptionText}
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </section>

            {job.requirements && job.requirements.length > 0 && (
              <section className={detailStyles.section}>
                <h2 className={detailStyles.sectionTitle}>Requirements & Qualifications</h2>
                <ul className={detailStyles.bulletsList}>
                  {job.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </section>
            )}

            {job.skillsRequired && job.skillsRequired.length > 0 && (
              <section className={detailStyles.section}>
                <h2 className={detailStyles.sectionTitle}>Required Skills</h2>
                <div className={detailStyles.skillsRow}>
                  {job.skillsRequired.map((skill, i) => (
                    <span key={i} className={detailStyles.skillBadge}>
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {job.benefits && job.benefits.length > 0 && (
              <section className={detailStyles.section}>
                <h2 className={detailStyles.sectionTitle}>Perks & Benefits</h2>
                <ul className={detailStyles.bulletsList}>
                  {job.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </section>
            )}

            {isSignedIn && (
              <section className={detailStyles.section} id="how-to-apply">
                <h2 className={detailStyles.sectionTitle}>How to Apply</h2>

                {applyError && <div className={detailStyles.errorBanner}>{applyError}</div>}

                {job.applicationType === "email" ? (
                  <div className={detailStyles.applyPanel}>
                    <Mail size={22} />
                    <div>
                      <h3>Email your application</h3>
                      <p>
                        Send your CV or resume to{" "}
                        <a href={`mailto:${job.contactEmail}`} className={detailStyles.inlineLink}>
                          {job.contactEmail}
                        </a>
                        .
                      </p>
                      {offPlatformSuccess ? (
                        <div className={detailStyles.successInline}>
                          <CheckCircle2 size={16} /> Application confirmed.
                        </div>
                      ) : (
                        <button
                          type="button"
                          className={detailStyles.submitBtn}
                          onClick={handleConfirmOffPlatformApplication}
                          disabled={offPlatformSubmitting}
                        >
                          {offPlatformSubmitting ? <Loader2 className="loading_icon" size={16} /> : "I've Sent My Application"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : job.applicationType === "external_link" ? (
                  <div className={detailStyles.applyPanel}>
                    <ExternalLink size={22} />
                    <div>
                      <h3>Apply on the company site</h3>
                      <p>This employer accepts applications through their own hiring page.</p>
                      <a
                        href={job.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={detailStyles.applyBtn}
                      >
                        Apply on Company Site <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className={detailStyles.applyPanel}>
                    <Sparkles size={22} />
                    <div>
                      <h3>Apply with your Resumy AI resume</h3>
                      <p>Choose a saved resume, check your match, answer any screening questions, and submit directly.</p>
                      <button type="button" onClick={handleOpenApplyModal} className={detailStyles.applyBtn}>
                        Start 1-Click Apply <Sparkles size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>

          <aside className={detailStyles.sidebar}>
            <div className={detailStyles.companyCard}>
              <h3 className={detailStyles.cardTitle}>About {company?.name}</h3>
              {company?.description && <p className={detailStyles.companyDesc}>{company.description}</p>}
              <div className={detailStyles.companyMetaList}>
                {company?.industry && <div><strong>Industry:</strong> {company.industry}</div>}
                {company?.location && <div><strong>HQ Location:</strong> {company.location}</div>}
                {company?.website && (
                  <div>
                    <strong>Website:</strong>{" "}
                    <a href={company.website} target="_blank" rel="noreferrer" className={detailStyles.inlineLink}>
                      {company.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showApplyModal && (
        <div className={detailStyles.modalOverlay}>
          <div className={detailStyles.modalCard}>
            <div className={detailStyles.modalHeader}>
              <h2>1-Click Apply to {job.title}</h2>
              <button onClick={() => setShowApplyModal(false)} className={detailStyles.closeModal}>
                &times;
              </button>
            </div>

            {applySuccess ? (
              <div className={detailStyles.successState}>
                <CheckCircle2 size={48} />
                <h3>Application Submitted!</h3>
                <p>The employer has received your resume and application.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitApplication} className={detailStyles.modalForm}>
                {applyError && <div className={detailStyles.errorBanner}>{applyError}</div>}

                <div className={detailStyles.formGroup}>
                  <label className={detailStyles.label}>Select Your Resumy AI Resume</label>
                  {userResumes.length === 0 ? (
                    <p className={detailStyles.helperText}>
                      No saved resumes found in your profile. You can create one in{" "}
                      <Link href="/dashboard/resumes" className={detailStyles.inlineLink}>
                        My Resumes
                      </Link>
                      .
                    </p>
                  ) : (
                    <select
                      className={detailStyles.selectInput}
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      id="select-resume-dropdown"
                    >
                      {userResumes.map((res) => (
                        <option key={res._id} value={res._id}>
                          {res.title || "Untitled Resume"} (Role: {res.targetRole || "General"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedResumeId && (
                  <div className={detailStyles.aiMatchBox}>
                    <div className={detailStyles.aiMatchHeader}>
                      <span><Sparkles size={16} /> AI Resume Match Analyzer</span>
                      <button
                        type="button"
                        onClick={handleCalculateAiMatch}
                        className={detailStyles.calcBtn}
                        disabled={checkingMatch}
                      >
                        {checkingMatch ? <Loader2 className="loading_icon" size={14} /> : "Check Match Score"}
                      </button>
                    </div>
                    {aiMatchScore !== null && (
                      <div className={detailStyles.scoreResult}>
                        Match Score: <strong>{aiMatchScore}%</strong>
                      </div>
                    )}
                  </div>
                )}

                {(job.screeningQuestions || []).length > 0 && (
                  <div className={detailStyles.screeningList}>
                    <h3>Screening Questions</h3>
                    {job.screeningQuestions?.map((question) => (
                      <div key={question.id} className={detailStyles.formGroup}>
                        <label className={detailStyles.label}>
                          {question.question} {question.required && <span aria-label="required">*</span>}
                        </label>
                        {question.type === "textarea" ? (
                          <textarea
                            className={detailStyles.textareaInput}
                            rows={3}
                            value={screeningAnswers[question.id] || ""}
                            onChange={(e) => setScreeningAnswer(question.id, e.target.value)}
                            required={question.required}
                          />
                        ) : question.type === "dropdown" ? (
                          <select
                            className={detailStyles.selectInput}
                            value={screeningAnswers[question.id] || ""}
                            onChange={(e) => setScreeningAnswer(question.id, e.target.value)}
                            required={question.required}
                          >
                            <option value="">Select an answer</option>
                            {(question.options || []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : question.type === "checkbox" ? (
                          <label className={detailStyles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={screeningAnswers[question.id] === "Yes"}
                              onChange={(e) => setScreeningAnswer(question.id, e.target.checked ? "Yes" : "No")}
                              required={question.required}
                            />
                            Yes
                          </label>
                        ) : (
                          <input
                            className={detailStyles.selectInput}
                            value={screeningAnswers[question.id] || ""}
                            onChange={(e) => setScreeningAnswer(question.id, e.target.value)}
                            required={question.required}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={detailStyles.formGroup}>
                  <label className={detailStyles.label}>Cover Letter / Message to Recruiter (Optional)</label>
                  <textarea
                    className={detailStyles.textareaInput}
                    rows={4}
                    placeholder="Introduce yourself and explain why you're a great fit for this position..."
                    value={coverLetterText}
                    onChange={(e) => setCoverLetterText(e.target.value)}
                    id="cover-letter-input"
                  />
                </div>

                <div className={detailStyles.modalFooter}>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className={detailStyles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={detailStyles.submitBtn}
                    disabled={submitting}
                    id="submit-application-btn"
                  >
                    {submitting ? <Loader2 className="loading_icon" size={16} /> : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
