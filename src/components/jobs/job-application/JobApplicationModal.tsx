"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Check, Loader2, Send, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, ExternalLink, Mail, ZoomIn } from "lucide-react";
import { motion } from "motion/react";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import { buildResumeFormData } from "@/hooks/useResumeFormData";
import viewerStyles from "@/components/resume/ResumeViewer.module.css";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import { AiButton } from "@/components/ui/AiButton";
import { CREDIT_COST } from "@/lib/creditCosts";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAlertStore } from "@/store/useAlertStore";
import type { JobMatchAnalysis } from "@/types/JobApplicationData";
import type { DraftApplicationData } from "@/types/DraftApplicationData";
import type { JobApplyPayload } from "@/types/JobApplyInput";
import type { TailorReport } from "@/types/TailorReport";
import CoverLetterResultCard from "@/components/cover-letter/CoverLetterResultCard";
import { useResumeStore } from "@/store/useResumeStore";
import styles from "./JobApplicationModal.module.css";
import { delayedScrollIntoView } from "@/utils/scrollIntoview";
import { maskEmail } from "@/utils/maskEmail";
import { buildJobApplyMailto } from "@/utils/buildJobApplyMailto";
import ResumePlusViewer, { UploadedResumePlusViewer } from "@/components/resume/ResumePlusViewer";
import Modal from "@/components/ui/modal/Modal";

interface JobDetail {
  _id: string;
  title: string;
  description?: string;
  applicationType?: "on_platform" | "external_link" | "email";
  externalUrl?: string;
  contactEmail?: string;
  screeningQuestions?: { id: string; question: string; type: string; options?: string[]; required: boolean }[];
}

interface Props {
  job: JobDetail;
  open: boolean;
  onClose: () => void;
  draft?: DraftApplicationData | null;
}

function getTier(score: number): { label: string; hint: string; cls: string } {
  if (score >= 95) return { label: "Perfect match", hint: "Ready to apply — your resume is an excellent fit.", cls: styles.tierPerfect };
  if (score >= 90) return { label: "Great match", hint: "Great match — you can still improve to perfect.", cls: styles.tierGreat };
  if (score >= 80) return { label: "Good match", hint: "Good match — tailor your resume to improve.", cls: styles.tierGood };
  if (score >= 65) return { label: "Moderate match", hint: "Moderate — tailoring is recommended.", cls: styles.tierModerate };
  if (score >= 50) return { label: "Low match", hint: "Tailoring will significantly boost your chances.", cls: styles.tierLow };
  if (score >= 30) return { label: "Poor match", hint: "Consider tailoring or highlighting transferable skills.", cls: styles.tierPoor };
  return { label: "Very poor match", hint: "Major gaps — tailoring is strongly recommended.", cls: styles.tierVeryPoor };
}

export default function JobApplicationModal({ job, open, onClose, draft }: Props) {
  const hasQuestions = (job.screeningQuestions?.length ?? 0) > 0;
  const totalSteps = 3;

  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<ResumeSelection | null>(null);
  const [analysis, setAnalysis] = useState<JobMatchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResumeId, setTailoredResumeId] = useState<string | null>(null);
  const [tailoredReport, setTailoredReport] = useState<TailorReport | null>(null);

  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [coverLetterText, setCoverLetterText] = useState("");
  const [coverLetterGenerating, setCoverLetterGenerating] = useState(false);
  const [coverLetterGenerated, setCoverLetterGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [senderInfo, setSenderInfo] = useState({ name: "", email: "", phone: "", location: "" });
  const getResumeById = useResumeStore((s) => s.getResumeById);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [success, setSuccess] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [initialResume, setInitialResume] = useState<{ mode: "saved" | "upload"; id: string } | null>(null);
  const [selectorKey, setSelectorKey] = useState(0);
  const draftCreatePromiseRef = useRef<Promise<string | null> | null>(null);
  const restoredAnalysisRef = useRef(false);
  const prefillResumeRef = useRef<{ mode: "saved" | "upload"; id: string } | null>(null);
  const fetchResumes = useResumeStore((s) => s.fetchResumes);
  const fetchUploadedResumes = useResumeStore((s) => s.fetchUploadedResumes);

  const resetAll = useCallback(() => {
    setStep(0);
    setSelection(null);
    setAnalysis(null);
    setAnalysisError("");
    setTailoredResumeId(null);
    setTailoredReport(null);
    setScreeningAnswers({});
    setCoverLetterText("");
    setCoverLetterGenerated(false);
    setCoverLetterGenerating(false);
    setCopied(false);
    setSenderInfo({ name: "", email: "", phone: "", location: "" });
    setApplyError("");
    setSuccess(false);
    setViewerOpen(false);
    setDraftId(null);
    setDraftSaving(false);
    setPrefillLoading(false);
    setInitialResume(null);
    draftCreatePromiseRef.current = null;
    restoredAnalysisRef.current = false;
    prefillResumeRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPrefillLoading(true);
    (async () => {
      try {
        await Promise.all([fetchResumes(), fetchUploadedResumes()]).catch(() => undefined);
        let d: DraftApplicationData | null = null;
        if (draft === undefined) {
          const res = await fetch(`/api/jobs/${job._id}/drafts`);
          const data = await res.json().catch(() => null);
          if (!res.ok || cancelled) return;
          d = (data?.draft as DraftApplicationData | null) ?? null;
          if (!d) return;
        } else {
          if (cancelled || !draft) return;
          d = draft;
        }
        setDraftId(d._id);
        draftCreatePromiseRef.current = Promise.resolve(d._id);
        if (d.jobMatchAnalysis) {
          setAnalysis(d.jobMatchAnalysis);
          restoredAnalysisRef.current = true;
        }
        if (Array.isArray(d.screeningAnswers)) {
          const answers: Record<string, string> = {};
          for (const a of d.screeningAnswers) {
            if (a?.questionId) answers[a.questionId] = a.answer || "";
          }
          setScreeningAnswers(answers);
        }
        if (d.tailoredResumeId) setTailoredResumeId(d.tailoredResumeId);
        setStep(typeof d.currentStep === "number" ? Math.min(Math.max(d.currentStep, 0), 2) : 0);
        const store = useResumeStore.getState();
        if (d.resume?.resumeType === "platform" && d.resume.resumeId) {
          const r = store.getResumeById(d.resume.resumeId);
          if (r?.content?.personalInfo) {
            prefillResumeRef.current = { mode: "saved", id: d.resume.resumeId };
            setInitialResume({ mode: "saved", id: d.resume.resumeId });
            setSelectorKey((k) => k + 1);
            const pi = r.content.personalInfo;
            setSenderInfo({ name: pi.name || "", email: pi.email || "", phone: pi.phone || "", location: pi.location || "" });
          }
        } else if (d.resume?.resumeType === "uploaded" && d.resume.uploadedResumeId) {
          const u = store.getUploadedResumeById(d.resume.uploadedResumeId);
          if (u?.parsedResume?.personalInfo) {
            prefillResumeRef.current = { mode: "upload", id: d.resume.uploadedResumeId };
            setInitialResume({ mode: "upload", id: d.resume.uploadedResumeId });
            setSelectorKey((k) => k + 1);
            const pi = u.parsedResume.personalInfo;
            setSenderInfo({ name: pi.name || "", email: pi.email || "", phone: pi.phone || "", location: pi.location || "" });
          }
        }
      } catch {
        // Prefill is best-effort; the user can always start fresh.
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, job._id, draft, fetchResumes, fetchUploadedResumes]);

  useEffect(() => {
    cardRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  const handleSelectionChange = useCallback((sel: ResumeSelection | null) => {
    const expected = prefillResumeRef.current;
    if (sel && expected) {
      const matches =
        (expected.mode === "saved" && sel.mode === "saved" && sel.selectedResumeId === expected.id) ||
        (expected.mode === "upload" && sel.mode === "upload" && sel.uploadedResumeId === expected.id);
      if (matches) {
        // Emission from restoring a draft: keep the restored analysis.
        prefillResumeRef.current = null;
        setSelection(sel);
        const pi = sel.mode === "saved"
          ? sel.selectedSavedResume?.content?.personalInfo
          : sel.resumeContent?.personalInfo;
        if (pi) setSenderInfo({ name: pi.name || "", email: pi.email || "", phone: pi.phone || "", location: pi.location || "" });
        return;
      }
    }
    restoredAnalysisRef.current = false;
    setSelection(sel);
    setAnalysis(null);
    setAnalysisError("");
    setTailoredResumeId(null);
    setTailoredReport(null);
    if (sel?.mode === "saved" && sel.selectedResumeId) {
      const r = getResumeById(sel.selectedResumeId);
      const pi = r?.content?.personalInfo;
      if (pi) setSenderInfo({ name: pi.name || "", email: pi.email || "", phone: pi.phone || "", location: pi.location || "" });
    } else if (sel?.mode === "upload" && sel.resumeContent?.personalInfo) {
      const pi = sel.resumeContent.personalInfo;
      setSenderInfo({ name: pi.name || "", email: pi.email || "", phone: pi.phone || "", location: pi.location || "" });
    } else if (!sel) {
      setSenderInfo({ name: "", email: "", phone: "", location: "" });
    }
  }, [getResumeById]);

  useEffect(() => {
    if (!selection) return;
    if (restoredAnalysisRef.current) {
      // Selection came from a restored draft that already has an analysis.
      restoredAnalysisRef.current = false;
      return;
    }
    let cancelled = false;
    let cleanupScroll: (() => void) | null = null;
    async function runAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError("");
      setAnalysis(null);
      try {
        const formData = buildResumeFormData(selection!);

        const res = await fetch(`/api/jobs/${job._id}/match-analysis`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        if (!cancelled) {
          setAnalysis(data as JobMatchAnalysis);
          cleanupScroll = delayedScrollIntoView("analysisReport", 250);
        }
      } catch (err) {
        if (!cancelled) setAnalysisError(err instanceof Error ? err.message : "Failed to analyze");
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    }
    runAnalysis();
    return () => {
      cancelled = true;
      cleanupScroll?.();
    };
  }, [selection, job._id]);

  const handleTailor = async () => {
    if (!selection || !analysis) return;
    setTailoring(true);
    setApplyError("");
    try {
      const formData = buildResumeFormData(selection);
      formData.append("jobMode", "text");
      formData.append("jobText", `${job.title} ${(job as any).description || ""}`);
      formData.append("analysis", JSON.stringify(analysis));

      const res = await fetch("/api/resume-tailor", { method: "POST", body: formData });
      const data = await res.json();
      if (res.status === 402) {
        useAlertStore.getState().addAlert("error", data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Tailoring failed");
      if (typeof data.newAiCredits === "number") useAiCreditStore.getState().setCredits(data.newAiCredits);
      setTailoredReport(data as TailorReport);
      setTimeout(() => import("@/utils/scrollIntoview").then(({ delayedScrollIntoView }) => delayedScrollIntoView("tailoredReport", 200)), 50);

      const sourceResume = selection.selectedSavedResume;
      const createRes = await fetch("/api/resume-improver/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourceResume?.title || "Resume"} - Tailored for ${job.title}`,
          template: sourceResume?.template,
          improvedResume: data.tailoredResume,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to save tailored resume");
      setTailoredResumeId(String(createData.id));
      if (draftId) {
        void fetch(`/api/jobs/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tailoredResumeId: String(createData.id) }),
        }).catch(() => undefined);
      }
      useAlertStore.getState().addAlert("success", "Tailored resume created and selected for this application.");
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setTailoring(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!selection) {
      setApplyError("Please select a resume first.");
      return;
    }
    setCoverLetterGenerating(true);
    setApplyError("");
    try {
      const formData = buildResumeFormData(selection);
      const companyName = (job as any).companyName || "";
      formData.append("targetCompany", companyName);
      formData.append("targetRole", job.title);
      formData.append("jobMode", "text");
      formData.append("jobText", `${job.title} ${(job as any).description || ""}`);
      const res = await fetch("/api/cover-letters/generate", { method: "POST", body: formData });
      const data = await res.json();
      if (res.status === 402) {
        useAlertStore.getState().addAlert("error", data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Failed to generate cover letter");
      if (typeof data.newAiCredits === "number") useAiCreditStore.getState().setCredits(data.newAiCredits);
      setCoverLetterText(data.content || "");
      setCoverLetterGenerated(true);
      const pi = selection.mode === "saved"
        ? selection.selectedSavedResume?.content?.personalInfo
        : selection.resumeContent?.personalInfo;
      if (pi) setSenderInfo({ name: pi.name || "", email: pi.email || "", phone: pi.phone || "", location: pi.location || "" });
      setTimeout(() => import("@/utils/scrollIntoview").then(({ delayedScrollIntoView }) => delayedScrollIntoView("coverLetterPreview", 200)), 100);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setCoverLetterGenerating(false);
    }
  };

  const handleCopyCoverLetter = async () => {
    try {
      await navigator.clipboard.writeText(coverLetterText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      useAlertStore.getState().addAlert("error", "Failed to copy");
    }
  };

  const canProceedStep1 = !!selection && !!analysis && !analysisLoading;
  const validateQuestions = () => {
    const missing = (job.screeningQuestions || []).find((q) => q.required && !screeningAnswers[q.id]?.trim());
    if (missing) {
      setApplyError(`Please answer: ${missing.question}`);
      return false;
    }
    return true;
  };

  const saveStep1Draft = useCallback((): Promise<string | null> => {
    if (!selection || !analysis) return Promise.resolve(null);
    const resumeRef =
      selection.mode === "saved"
        ? { resumeType: "platform", resumeId: selection.selectedResumeId }
        : selection.uploadedResumeId
          ? { resumeType: "uploaded", uploadedResumeId: selection.uploadedResumeId }
          : null;
    if (!resumeRef) return Promise.resolve(null);
    return fetch(`/api/jobs/${job._id}/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: resumeRef,
        jobMatchAnalysis: analysis,
        ...(tailoredResumeId ? { tailoredResumeId } : {}),
        currentStep: 1,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) return null;
        const id = typeof data?.draft?._id === "string" ? (data.draft._id as string) : null;
        if (id) setDraftId(id);
        return id;
      })
      .catch(() => null);
  }, [selection, analysis, tailoredResumeId, job._id]);

  const patchDraftWithAnswers = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const answersPayload = (job.screeningQuestions || []).map((q) => ({
          questionId: q.id,
          question: q.question,
          answer: screeningAnswers[q.id] || "",
        }));
        const res = await fetch(`/api/jobs/drafts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screeningAnswers: answersPayload,
            ...(tailoredResumeId ? { tailoredResumeId } : {}),
            currentStep: 2,
          }),
        });
        if (res.ok) setDraftId(id);
        return res.ok;
      } catch {
        return false;
      }
    },
    [job.screeningQuestions, screeningAnswers, tailoredResumeId]
  );

  const handleNext = async () => {
    setApplyError("");
    if (step === 0) {
      if (!canProceedStep1) return;
      // Save step 1 in the background and move on without waiting for it.
      draftCreatePromiseRef.current = saveStep1Draft();
      setStep(1);
      return;
    }
    if (step === 1) {
      if (hasQuestions && !validateQuestions()) return;
      if (!hasQuestions) {
        // Nothing required to save here, so proceed without waiting.
        setStep(2);
        if (draftId && tailoredResumeId) {
          void fetch(`/api/jobs/drafts/${draftId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tailoredResumeId, currentStep: 2 }),
          }).catch(() => undefined);
        }
        return;
      }
      // Wait for the draft id so the answers can be saved onto the draft.
      setDraftSaving(true);
      try {
        let id = await draftCreatePromiseRef.current;
        if (!id) {
          // The background create failed; retry once, then move on regardless.
          // The final apply carries all data, so this never blocks the user.
          draftCreatePromiseRef.current = saveStep1Draft();
          id = await draftCreatePromiseRef.current;
        }
        if (id) {
          const ok = await patchDraftWithAnswers(id);
          if (!ok) {
            setApplyError("Could not save your answers just now — please try again.");
            return;
          }
        }
        setStep(2);
      } finally {
        setDraftSaving(false);
      }
    }
  };

  const handleBack = () => {
    setApplyError("");
    if (step > 0) setStep((s) => s - 1);
  };

  function buildApplyPayload(source: "platform" | "off_platform"): JobApplyPayload {
    const screeningAnswersPayload = (job.screeningQuestions || []).map((q) => ({
      questionId: q.id,
      question: q.question,
      answer: screeningAnswers[q.id] || "",
    }));
    const jobMatchAnalysis = tailoredReport?.matchAnalysis ?? analysis;
    if (!jobMatchAnalysis) throw new Error("Missing match analysis");
    const effectiveResumeId = tailoredResumeId || (selection?.mode === "saved" ? selection.selectedResumeId : undefined);
    if (effectiveResumeId) {
      return { resume: { resumeType: "platform", resumeId: effectiveResumeId }, jobMatchAnalysis, screeningAnswers: screeningAnswersPayload, coverLetterText, source };
    }
    if (selection?.mode === "upload" && selection.uploadedResumeId) {
      return { resume: { resumeType: "uploaded", uploadedResumeId: selection.uploadedResumeId }, jobMatchAnalysis, screeningAnswers: screeningAnswersPayload, coverLetterText, source };
    }
    throw new Error("Choose a PDF or image resume first.");
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateQuestions()) return;
    setSubmitting(true);
    setApplyError("");
    try {
      const res = await fetch(`/api/jobs/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApplyPayload("platform")),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");
      if (typeof data.unreadCount === "number") {
        useNotificationStore.getState().setUnreadCount(data.unreadCount);
      } else {
        useNotificationStore.getState().incrementUnreadCount(1);
      }
      setSuccess(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const tier = analysis ? getTier(analysis.score) : null;
  const finalScore = tailoredReport?.matchAnalysis.score ?? analysis?.score ?? 0;
  const finalTier = getTier(finalScore);
  const tailoredTier = tailoredReport ? getTier(tailoredReport.matchAnalysis.score) : null;
  const tailoredDiff = tailoredReport && analysis ? tailoredReport.matchAnalysis.score - analysis.score : 0;
  const offPlatformType = job.applicationType === "external_link" || job.applicationType === "email";

  const handleConfirmOffPlatform = async () => {
    if (!validateQuestions()) return;
    setSubmitting(true);
    setApplyError("");
    try {
      const res = await fetch(`/api/jobs/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApplyPayload("off_platform")),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm");
      if (typeof data.unreadCount === "number") {
        useNotificationStore.getState().setUnreadCount(data.unreadCount);
      } else {
        useNotificationStore.getState().incrementUnreadCount(1);
      }
      setSuccess(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Apply to ${job.title}`} size="md">

        <div className={styles.stepIndicator}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`${styles.stepDot} ${i === step ? styles.stepDotActive : ""} ${i < step ? styles.stepDotDone : ""}`}>
              {i < step ? <Check className={styles.stepDotIcon} /> : <span>{i + 1}</span>}
            </div>
          ))}
        </div>

        {success ? (
          offPlatformType ? (
            <div className={styles.successState}>
              <CheckCircle2 size={48} />
              <h3>Application saved — continue off-platform</h3>
              <p>
                Your application was saved here. You&apos;re now heading off-platform to finish applying directly with the employer.
              </p>
              <div className={styles.continueActions}>
                {job.applicationType === "external_link" && job.externalUrl ? (
                  <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.primaryBtn}>
                    <ExternalLink size={16} /> Continue to Company Site
                  </a>
                ) : job.applicationType === "email" && job.contactEmail ? (
                  <a
                    href={buildJobApplyMailto({
                      email: job.contactEmail,
                      jobTitle: job.title,
                      applicantName: senderInfo.name,
                      coverLetter: coverLetterText,
                    })}
                    className={styles.primaryBtn}
                  >
                    <Mail size={16} /> Continue to Email
                  </a>
                ) : null}
                <button onClick={onClose} className={styles.backBtn}>
                  Close
                </button>
              </div>
              {job.applicationType === "external_link" && job.externalUrl ? (
                <span className={styles.continueHint}>{job.externalUrl}</span>
              ) : job.applicationType === "email" && job.contactEmail ? (
                <span className={styles.continueHint}>{job.contactEmail}</span>
              ) : null}
            </div>
          ) : (
            <div className={styles.successState}>
              <CheckCircle2 size={48} />
              <h3>Application sent</h3>
              <p>Your application has been sent — the employer received your resume.</p>
              <button onClick={onClose} className={styles.primaryBtn}>Close</button>
            </div>
          )
        ) : (
          <>

          <div ref={cardRef} data-steps-wrapper data-scroll-container className={styles.stepsWrapper}>
            <div className={`${styles.stepContent} ${step === 0 ? styles.stepActive : ""}`}>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: step === 0 ? 1 : 0, x: step === 0 ? 0 : 16 }} transition={{ duration: 0.25 }} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className={styles.stepBadge}>Step 1 of {totalSteps}</div>
              <h3 className={styles.stepTitle}>Select your resume</h3>
              <p className={styles.stepSubtitle}>Choose a saved resume or upload a PDF/image. We’ll analyze how well it matches this job.</p>

              <ResumeSelector
                key={`resume-selector-${selectorKey}`}
                onSelectionChange={handleSelectionChange}
                showLoader={true}
                animatedLoader={analysisLoading}
                initialSavedResumeId={initialResume?.mode === "saved" ? initialResume.id : null}
                initialUploadedResumeId={initialResume?.mode === "upload" ? initialResume.id : null}
              />


              {analysisError && <div className={styles.errorBanner} style={{ marginTop: "1rem" }}>{analysisError}</div>}

              {analysis && tier && !tailoredReport && (
                <div id='analysisReport' style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", padding: "1rem", background: "var(--gray-50)" }}>
                  <div className={styles.analysisGrid}>
                    <ScoreCircle score={analysis.score} />
                    <span className={`${styles.tierPill} ${tier.cls}`}>{tier.label}</span>
                    <div className={styles.analysisText}>
                      <span className={styles.tierHint}>{tier.hint}</span>
                      {analysis.verdict && <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.5 }}>{analysis.verdict}</p>}
                    </div>
                  </div>

                  {(analysis.missingKeywords.length > 0 || analysis.missingSkills.length > 0) && (
                    <div className={styles.bulletSection}>
                      <span className={styles.bulletSectionTitle}>What’s missing</span>
                      <ul className={styles.bulletList}>
                        {[...analysis.missingKeywords, ...analysis.missingSkills].slice(0, 8).map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.gaps.length > 0 && (
                    <div className={styles.bulletSection}>
                      <span className={styles.bulletSectionTitle}>Gaps</span>
                      <ul className={styles.bulletList}>{analysis.gaps.slice(0, 4).map((g, i) => <li key={i}>{g}</li>)}</ul>
                    </div>
                  )}

                  {analysis.suggestions.length > 0 && (
                    <div className={styles.bulletSection}>
                      <span className={styles.bulletSectionTitle}>How to improve</span>
                      <ul className={styles.bulletList}>{analysis.suggestions.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}</ul>
                    </div>
                  )}

                  {applyError && <div className={styles.errorBanner}>{applyError}</div>}

                  <AiButton variant="secondary" disabled={tailoring} onClick={handleTailor} cost={CREDIT_COST.resumeTailor} fullWidth>
                    {tailoring ? <><Loader2 size={16} className={styles.spinner} /> Tailoring...</> : "Generate tailored resume"}
                  </AiButton>
                </div>
              )}

              {analysis && tier && tailoredReport && tailoredTier && (
                <div id="tailoredReport" style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", padding: "1rem", background: "var(--gray-50)" }}>
                  <div className={styles.scoreComparison}>
                    <div className={styles.scoreBox}>
                      <span className={styles.scoreLabel}>Original</span>
                      <ScoreCircle score={analysis.score} />
                    </div>
                    <div className={styles.scoreArrow}>
                      <ArrowRight className={styles.arrowIcon} />
                      <span className={styles.scoreDiff}>+{tailoredDiff}%</span>
                    </div>
                    <div className={styles.scoreBox}>
                      <span className={styles.scoreLabel}>Tailored</span>
                      <ScoreCircle score={tailoredReport.matchAnalysis.score} />
                    </div>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.5 }}>{tailoredReport.explanation}</p>
                  {tailoredReport.keyChanges.length > 0 && (
                    <div className={styles.bulletSection}>
                      <span className={styles.bulletSectionTitle}>What’s been improved</span>
                      <ul className={styles.bulletList}>{tailoredReport.keyChanges.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}
                  <div className={styles.successBanner}><CheckCircle2 size={16} /> Tailored resume saved and selected — new score {tailoredReport.matchAnalysis.score}%</div>
                  {applyError && <div className={styles.errorBanner}>{applyError}</div>}
                  <AiButton variant="primary" disabled={tailoring} onClick={handleTailor} cost={CREDIT_COST.resumeTailor} fullWidth>
                    {tailoring ? <><Loader2 size={16} className={styles.spinner} /> Tailoring...</> : "Regenerate tailored resume"}
                  </AiButton>
                  {tailoredResumeId && (
                    <Link href={`/editor/${tailoredResumeId}`} target="_blank" style={{ fontSize: "var(--text-xs)", color: "var(--primary-600)", textAlign: "center" }}>
                      Open tailored resume in editor
                    </Link>
                  )}
                </div>
              )}

              {applyError && !analysis && <div className={styles.errorBanner} style={{ marginTop: "1rem" }}>{applyError}</div>}
              </motion.div>
            </div>

            {/* STEP 2 */}

            <div className={`${styles.stepContent} ${step === 1 ? styles.stepActive : ""}`}>

              

              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: step === 1 ? 1 : 0, x: step === 1 ? 0 : 16 }} transition={{ duration: 0.25 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.stepBadge}>Step 2 of {totalSteps}</div>
              <h3 className={styles.stepTitle}>Additional information</h3>
              <p className={styles.stepSubtitle}>{hasQuestions ? "Answer employer questions and add an optional cover letter." : "Add an optional cover letter."}</p>

              {applyError && <div className={styles.errorBanner}>{applyError}</div>}

              {hasQuestions && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
                  {job.screeningQuestions!.map((q) => (
                    <div key={q.id} className={styles.formGroup}>
                      <label className={styles.label}>{q.question} {q.required && <span aria-label="required">*</span>}</label>
                      {q.type === "textarea" ? (
                        <textarea className={styles.textareaInput} rows={3} value={screeningAnswers[q.id] || ""} onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} required={q.required} />
                      ) : q.type === "dropdown" ? (
                        <select className={styles.selectInput} value={screeningAnswers[q.id] || ""} onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} required={q.required}>
                          <option value="">Select an answer</option>
                          {(q.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : q.type === "checkbox" ? (
                        <label className={styles.checkboxLabel}><input type="checkbox" checked={screeningAnswers[q.id] === "Yes"} onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [q.id]: e.target.checked ? "Yes" : "No" }))} required={q.required} /> Yes</label>
                      ) : (
                        <input className={styles.selectInput} value={screeningAnswers[q.id] || ""} onChange={(e) => setScreeningAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} required={q.required} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <label className={styles.label}>Cover letter / message (optional)</label>
                <AiButton variant="secondary" size="sm" onClick={handleGenerateCoverLetter} disabled={!selection || coverLetterGenerating} cost={CREDIT_COST.coverLetterGenerate}>
                  {coverLetterGenerating ? <><Loader2 size={14} className={styles.spinner} /> Generating...</> : coverLetterGenerated ? "Regenerate" : "Generate"}
                </AiButton>
              </div>

              {coverLetterGenerated && coverLetterText ? (
                <div id="coverLetterPreview">
                  <CoverLetterResultCard hideLetterhead coverLetter={coverLetterText} senderInfo={senderInfo} targetRole={job.title} onCopy={handleCopyCoverLetter} copied={copied} onEditChange={setCoverLetterText} />
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <textarea className={styles.textareaInput} rows={4} placeholder="Introduce yourself and explain why you're a great fit..." value={coverLetterText} onChange={(e) => setCoverLetterText(e.target.value)} />
                </div>
              )}
              </motion.div>
            </div>

            {/* STEP 3 */}

            <div className={`${styles.stepContent} ${step === 2 ? styles.stepActive : ""}`}>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: step === 2 ? 1 : 0, x: step === 2 ? 0 : 16 }} transition={{ duration: 0.25 }} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className={styles.stepBadge}>Step 3 of {totalSteps}</div>
              <h3 className={styles.stepTitle}>Review and apply</h3>
              <p className={styles.stepSubtitle}>Review your resume, answers, and cover letter before sending.</p>

              {applyError && <div className={styles.errorBanner}>{applyError}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "center" }}>
                  <div className={viewerStyles.previewThumbnail} style={{ maxHeight: "320px" }}>
                    {selection?.mode === "saved" && selection.selectedSavedResume ? (

                      <ResumePlusViewer 
                        title = {`${selection.selectedSavedResume.title || "Resume"}${tailoredReport ? " — Tailored" : ""}`}
                        templateId={selection.selectedSavedResume.template}
                        content={tailoredReport?.tailoredResume ?? selection.selectedSavedResume.content}
                      />
  
                    ) : selection?.mode === "upload" && selection.pdfPreviewUrls.length > 0 ? (
                      <UploadedResumePlusViewer resume={{
                        _id: selection.uploadedResumeId ?? undefined,
                        title: selection.uploadedTitle || "Uploaded Resume",
                        pages: selection.pdfPreviewUrls,
                        ...(selection.resumeContent ? { parsedResume: selection.resumeContent } : {}),
                      }} />
                    ) : (
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", padding: "1rem", textAlign: "center" }}>No resume preview</p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", minWidth: "120px" }}>
                    <ScoreCircle score={finalScore} />
                    <span className={`${styles.tierPill} ${finalTier.cls}`}>{finalTier.label}</span>
                    <span className={styles.tierHint} style={{ textAlign: "center" }}>{finalTier.hint}</span>
                  </div>
                </div>

                {hasQuestions && (
                  <div className={styles.bulletSection}>
                    <span className={styles.bulletSectionTitle}>Your answers</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {job.screeningQuestions!.map((q) => (
                        <div key={q.id} style={{ fontSize: "var(--text-xs)", color: "var(--gray-700)", background: "var(--gray-50)", padding: "0.5rem", borderRadius: "6px" }}>
                          <strong>{q.question}</strong>
                          <div>{screeningAnswers[q.id] || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.bulletSection}>
                  <span className={styles.bulletSectionTitle}>Cover letter</span>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", background: "var(--gray-50)", padding: "0.75rem", borderRadius: "6px", whiteSpace: "pre-wrap" }}>{coverLetterText.trim() || "— No cover letter —"}</p>
                </div>

                {tailoredResumeId && <div className={styles.successBanner}><CheckCircle2 size={14} /> Tailored resume will be sent.</div>}
                {!tailoredResumeId && selection?.mode === "upload" && <div className={styles.successBanner}><AlertTriangle size={14} /> Uploaded resume will be sent as images.</div>}
              </div>
              </motion.div>
            </div>
          </div>
          <div className={styles.footer}>
            {step > 0 && (
              <button type="button" onClick={handleBack} className={styles.backBtn}><ArrowLeft size={16} /> Back</button>
            )}
            <span className={styles.spacer} />
            {step === 0 && (
              <button type="button" className={styles.primaryBtn} onClick={handleNext} disabled={!canProceedStep1 || prefillLoading}>
                Continue <ArrowRight size={16} />
              </button>
            )}
            {step === 1 && (
              <button type="button" onClick={handleNext} className={styles.primaryBtn} disabled={draftSaving}>
                {draftSaving ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} /> Saving...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}
            {step === 2 && (
              offPlatformType ? (
                job.applicationType === "external_link" && job.externalUrl ? (
                  <button type="button" onClick={handleConfirmOffPlatform} className={styles.primaryBtn} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} /> Sending...
                      </>
                    ) : (
                      <>
                        <ExternalLink size={16} /> Apply on Company Site
                      </>
                    )}
                  </button>
                ) : job.applicationType === "email" && job.contactEmail ? (
                  <button type="button" onClick={handleConfirmOffPlatform} className={`${styles.primaryBtn} ${styles.emailApplyBtn}`} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} /> Sending...
                      </>
                    ) : (
                        <span className={styles.emailBtnLabel}>
                          <Mail size={16} /> Email {maskEmail(job.contactEmail)}
                        </span>
                    )}
                  </button>
                ) : (
                  <button type="button" onClick={handleConfirmOffPlatform} className={styles.primaryBtn} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} /> Sending...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Confirm Application
                      </>
                    )}
                  </button>
                )
              ) : (
                <button type="button" onClick={(e) => handleApply(e as any)} className={styles.primaryBtn} disabled={submitting}>{submitting ? <><Loader2 size={16} className={styles.spinner} /> Sending...</> : <><Send size={16} /> Send application</>}</button>
              )
            )}
          </div>
          </>
        )}
    </Modal>
  );
}