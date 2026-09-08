"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Check, Loader2, Send, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, ExternalLink, Mail, ZoomIn } from "lucide-react";
import { motion } from "motion/react";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import ResumeComponent from "@/components/resume/ResumeComponent";
import ResumeViewer from "@/components/resume/ResumeViewer";
import viewerStyles from "@/components/resume/ResumeViewer.module.css";
import { normalizeTemplateId } from "@/lib/templateRenderer";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import { AiButton } from "@/components/ui/AiButton";
import { CREDIT_COST } from "@/lib/creditCosts";
import { useAiCreditStore } from "@/store/useAiCreditStore";
import { useAlertStore } from "@/store/useAlertStore";
import type { MatchAnalysis } from "@/lib/ai";
import type { TailorReport } from "@/types/TailorReport";
import styles from "./JobApplicationModal.module.css";
import { delayedScrollIntoView } from "@/utils/scrollIntoview";

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

export default function JobApplicationModal({ job, open, onClose }: Props) {
  const hasQuestions = (job.screeningQuestions?.length ?? 0) > 0;
  const totalSteps = 3;

  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<ResumeSelection | null>(null);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [tailoring, setTailoring] = useState(false);
  const [tailoredResumeId, setTailoredResumeId] = useState<string | null>(null);
  const [tailoredReport, setTailoredReport] = useState<TailorReport | null>(null);

  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [coverLetterText, setCoverLetterText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [success, setSuccess] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const resetAll = useCallback(() => {
    setStep(0);
    setSelection(null);
    setAnalysis(null);
    setAnalysisError("");
    setTailoredResumeId(null);
    setTailoredReport(null);
    setScreeningAnswers({});
    setCoverLetterText("");
    setApplyError("");
    setSuccess(false);
    setViewerOpen(false);
  }, []);

  useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  useEffect(() => {
    cardRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  const handleSelectionChange = useCallback((sel: ResumeSelection | null) => {
    setSelection(sel);
    setAnalysis(null);
    setAnalysisError("");
    setTailoredResumeId(null);
    setTailoredReport(null);
  }, []);

  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    let cleanupScroll: (() => void) | null = null;
    async function runAnalysis() {
      setAnalysisLoading(true);
      setAnalysisError("");
      setAnalysis(null);
      try {
        const formData = new FormData();
        formData.append("resumeMode", selection!.mode);
        if (selection!.mode === "saved") {
          formData.append("resumeId", selection!.selectedResumeId);
        } else {
          if (selection!.selectedFile && selection!.selectedFile.type.startsWith("image/")) {
            formData.append("resumeFile", selection!.selectedFile);
          } else if (selection!.pdfCanvasRefs.length > 0) {
            for (const canvas of selection!.pdfCanvasRefs) {
              const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
              if (blob) formData.append("resumeFile", blob, "page.png");
            }
          } else {
            throw new Error("Invalid resume file selection.");
          }
        }

        const res = await fetch(`/api/jobs/${job._id}/match-analysis`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        if (!cancelled) {
          setAnalysis(data as MatchAnalysis);
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
      const formData = new FormData();
      formData.append("resumeMode", selection.mode);
      if (selection.mode === "saved") {
        formData.append("resumeId", selection.selectedResumeId);
      } else {
        if (selection.selectedFile && selection.selectedFile.type.startsWith("image/")) {
          formData.append("resumeFile", selection.selectedFile);
        } else if (selection.pdfCanvasRefs.length > 0) {
          for (const canvas of selection.pdfCanvasRefs) {
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
            if (blob) formData.append("resumeFile", blob, "page.png");
          }
        }
      }
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
      useAlertStore.getState().addAlert("success", "Tailored resume created and selected for this application.");
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setTailoring(false);
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

  const handleNext = () => {
    setApplyError("");
    if (step === 0 && !canProceedStep1) return;
    if (step === 0) setStep(1);
    else if (step === 1) {
      if (hasQuestions && !validateQuestions()) return;
      setStep(2);
    }
  };

  const handleBack = () => {
    setApplyError("");
    if (step > 0) setStep((s) => s - 1);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateQuestions()) return;
    setSubmitting(true);
    setApplyError("");
    try {
      const effectiveResumeId = tailoredResumeId || (selection?.mode === "saved" ? selection.selectedResumeId : undefined);
      const screeningAnswersPayload = (job.screeningQuestions || []).map((q) => ({
        questionId: q.id,
        question: q.question,
        answer: screeningAnswers[q.id] || "",
      }));
      let customResumeUrl: string | undefined;
      let resumeIdToSend = effectiveResumeId;
      if (selection?.mode === "upload" && !tailoredResumeId) {
        customResumeUrl = "upload-placeholder";
        resumeIdToSend = undefined;
      }
      const res = await fetch(`/api/jobs/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: resumeIdToSend,
          coverLetterText: coverLetterText || undefined,
          screeningAnswers: screeningAnswersPayload,
          customResumeUrl,
          source: "platform",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");
      setSuccess(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const tier = analysis ? getTier(analysis.score) : null;
  const finalScore = tailoredReport?.matchScoreAfter ?? analysis?.score ?? 0;
  const finalTier = getTier(finalScore);
  const offPlatformType = job.applicationType === "external_link" || job.applicationType === "email";

  const handleConfirmOffPlatform = async () => {
    setSubmitting(true);
    setApplyError("");
    try {
      const res = await fetch(`/api/jobs/${job._id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "off_platform" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm");
      setSuccess(true);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Apply to {job.title}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">&times;</button>
        </div>

        <div className={styles.stepIndicator}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`${styles.stepDot} ${i === step ? styles.stepDotActive : ""} ${i < step ? styles.stepDotDone : ""}`}>
              {i < step ? <Check className={styles.stepDotIcon} /> : <span>{i + 1}</span>}
            </div>
          ))}
        </div>

        {success ? (
          <div className={styles.successState}>
            <CheckCircle2 size={48} />
            <h3>Application sent</h3>
            <p>Your application has been sent — the employer received your resume.</p>
            <button onClick={onClose} className={styles.primaryBtn}>Close</button>
          </div>
        ) : (
          <>
          <div ref={cardRef} data-steps-wrapper data-scroll-container className={styles.stepsWrapper}>
            <div className={`${styles.stepContent} ${step === 0 ? styles.stepActive : ""}`}>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: step === 0 ? 1 : 0, x: step === 0 ? 0 : 16 }} transition={{ duration: 0.25 }} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className={styles.stepBadge}>Step 1 of {totalSteps}</div>
              <h3 className={styles.stepTitle}>Select your resume</h3>
              <p className={styles.stepSubtitle}>Choose a saved resume or upload a PDF/image. We’ll analyze how well it matches this job.</p>

              <ResumeSelector onSelectionChange={handleSelectionChange} />

              {analysisLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", color: "var(--gray-500)", fontSize: "var(--text-sm)" }}>
                  <Loader2 size={16} className={styles.spinner} /> Analyzing match...
                </div>
              )}

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

              {analysis && tier && tailoredReport && (() => {
                const newTier = getTier(tailoredReport.matchScoreAfter);
                const diff = tailoredReport.matchScoreAfter - analysis.score;
                return (
                  <div id="tailoredReport" style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", padding: "1rem", background: "var(--gray-50)" }}>
                    <div className={styles.scoreComparison}>
                      <div className={styles.scoreBox}>
                        <span className={styles.scoreLabel}>Original</span>
                        <ScoreCircle score={analysis.score} />
                      </div>
                      <div className={styles.scoreArrow}>
                        <ArrowRight className={styles.arrowIcon} />
                        <span className={styles.scoreDiff}>+{diff}%</span>
                      </div>
                      <div className={styles.scoreBox}>
                        <span className={styles.scoreLabel}>Tailored</span>
                        <ScoreCircle score={tailoredReport.matchScoreAfter} />
                      </div>
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.5 }}>{tailoredReport.explanation}</p>
                    {tailoredReport.keyChanges.length > 0 && (
                      <div className={styles.bulletSection}>
                        <span className={styles.bulletSectionTitle}>What’s been improved</span>
                        <ul className={styles.bulletList}>{tailoredReport.keyChanges.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
                      </div>
                    )}
                    <div className={styles.successBanner}><CheckCircle2 size={16} /> Tailored resume saved and selected — new score {tailoredReport.matchScoreAfter}%</div>
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
                );
              })()}

              {applyError && !analysis && <div className={styles.errorBanner} style={{ marginTop: "1rem" }}>{applyError}</div>}
              </motion.div>
            </div>

            <div className={`${styles.stepContent} ${step === 1 ? styles.stepActive : ""}`}>
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: step === 1 ? 1 : 0, x: step === 1 ? 0 : 16 }} transition={{ duration: 0.25 }} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className={styles.stepBadge}>Step 2 of {totalSteps}</div>
              <h3 className={styles.stepTitle}>Additional information</h3>
              <p className={styles.stepSubtitle}>{hasQuestions ? "Answer employer questions and add an optional cover letter." : "Add an optional cover letter."}</p>

              {applyError && <div className={styles.errorBanner}>{applyError}</div>}

              {hasQuestions && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
                  {job.screeningQuestions!.map((q) => (
                    <div key={q.id} className={styles.formGroup}>
                      <label className={styles.label}>{q.question} {q.required && <span className={styles.asterisk} aria-label="required">*</span>}</label>
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

              <div className={styles.formGroup}>
                <label className={styles.label}>Cover letter / message (optional)</label>
                <textarea className={styles.textareaInput} rows={4} placeholder="Introduce yourself and explain why you're a great fit..." value={coverLetterText} onChange={(e) => setCoverLetterText(e.target.value)} />
              </div>
              </motion.div>
            </div>

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
                      <>
                        <div style={{ maxHeight: "320px", overflow: "hidden", background: "white", padding: "0.25rem" }}>
                          <ResumeComponent resumeContent={tailoredReport?.tailoredResume ?? selection.selectedSavedResume.content} templateId={normalizeTemplateId(selection.selectedSavedResume.template)} />
                        </div>
                        <button type="button" className={viewerStyles.viewBtn} onClick={() => setViewerOpen(true)}>
                          <ZoomIn size={12} /> View
                        </button>
                        <ResumeViewer
                          isOpen={viewerOpen}
                          onClose={() => setViewerOpen(false)}
                          resumeContent={tailoredReport?.tailoredResume ?? selection.selectedSavedResume.content}
                          templateId={normalizeTemplateId(selection.selectedSavedResume.template)}
                          title={`${selection.selectedSavedResume.title || "Resume"}${tailoredReport ? " — Tailored" : ""}`}
                        />
                      </>
                    ) : selection?.mode === "upload" && selection.selectedFile ? (
                      selection.selectedFile.type.startsWith("image/") ? (
                        <img src={URL.createObjectURL(selection.selectedFile)} alt="Resume preview" style={{ width: "100%", objectFit: "contain" }} />
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          {selection.pdfPreviewUrls.map((url, i) => <img key={i} src={url} alt={`Preview ${i + 1}`} style={{ width: "100%", borderRadius: "6px" }} />)}
                        </div>
                      )
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
              <button type="button" className={styles.primaryBtn} onClick={handleNext} disabled={!canProceedStep1}>
                Continue <ArrowRight size={16} />
              </button>
            )}
            {step === 1 && (
              <button type="button" onClick={handleNext} className={styles.primaryBtn}>Continue <ArrowRight size={16} /></button>
            )}
            {step === 2 && (
              offPlatformType ? (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  {job.applicationType === "external_link" && job.externalUrl ? (
                    <a href={job.externalUrl} target="_blank" rel="noopener noreferrer" className={styles.primaryBtn}><ExternalLink size={16} /> Apply on Company Site</a>
                  ) : job.applicationType === "email" && job.contactEmail ? (
                    <a href={`mailto:${job.contactEmail}`} className={styles.primaryBtn}><Mail size={16} /> Email {job.contactEmail}</a>
                  ) : null}
                  <button type="button" onClick={handleConfirmOffPlatform} className={styles.backBtn} disabled={submitting}>{submitting ? <><Loader2 size={16} className={styles.spinner} /> Sending...</> : "I've Applied — Confirm"}</button>
                </div>
              ) : (
                <button type="button" onClick={(e) => handleApply(e as any)} className={styles.primaryBtn} disabled={submitting}>{submitting ? <><Loader2 size={16} className={styles.spinner} /> Sending...</> : <><Send size={16} /> Send application</>}</button>
              )
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
