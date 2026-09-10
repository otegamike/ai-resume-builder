"use client";

import { useState } from "react";
import { CheckCircle2, ZoomIn } from "lucide-react";
import ResumeComponent from "@/components/resume/ResumeComponent";
import ResumeViewer from "@/components/resume/ResumeViewer";
import viewerStyles from "@/components/resume/ResumeViewer.module.css";
import { normalizeTemplateId } from "@/lib/templateRenderer";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import styles from "./JobApplicationDetails.module.css";
import modalStyles from "./JobApplicationModal.module.css";

function getTier(score: number): { label: string; hint: string; cls: string } {
  if (score >= 95) return { label: "Perfect match", hint: "Ready to apply — your resume is an excellent fit.", cls: modalStyles.tierPerfect };
  if (score >= 90) return { label: "Great match", hint: "Great match — you can still improve to perfect.", cls: modalStyles.tierGreat };
  if (score >= 80) return { label: "Good match", hint: "Good match — tailor your resume to improve.", cls: modalStyles.tierGood };
  if (score >= 65) return { label: "Moderate match", hint: "Moderate — tailoring is recommended.", cls: modalStyles.tierModerate };
  if (score >= 50) return { label: "Low match", hint: "Tailoring will significantly boost your chances.", cls: modalStyles.tierLow };
  if (score >= 30) return { label: "Poor match", hint: "Consider tailoring or highlighting transferable skills.", cls: modalStyles.tierPoor };
  return { label: "Very poor match", hint: "Major gaps — tailoring is strongly recommended.", cls: modalStyles.tierVeryPoor };
}

interface JobApplicationDetailsProps {
  application: any;
}

export default function JobApplicationDetails({ application }: JobApplicationDetailsProps) {
  const job = application.jobId || application.job;
  const resumeDoc = application.resume;
  const resumeContent = resumeDoc?.content || application.resumeSnapshot || application.resumeContent;
  const templateIdRaw = resumeDoc?.template || application.templateId || "template1";
  const normalizedId = templateIdRaw ? normalizeTemplateId(templateIdRaw) : "template1" as any;
  const score = application.jobMatchAnalysis?.score ?? application.analysisReport?.score ?? application.matchScore ?? 0;
  const tier = getTier(score);
  const screeningAnswers: { questionId: string; question: string; answer: string }[] = application.screeningAnswers || [];
  const coverLetter: string = application.coverLetterText || "";
  const status: string = application.status || "submitted";
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {job && (
        <div style={{ borderBottom: "1px solid var(--gray-200)", paddingBottom: "0.75rem" }}>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--primary-900)" }}>{job.title}</h3>
          <div className={styles.jobMeta}>
            <span>{job.companyId?.name || job.companyName || ""}</span>
            <span>• {job.location || ""}</span>
            <span className={`${styles.statusPill} ${status === "withdrawn" ? styles.statusWithdrawn : styles.statusSubmitted}`}>{status.replace("_", " ").toUpperCase()}</span>
          </div>
        </div>
      )}

      <div className={styles.grid} style={{ alignItems: "center" }}>
        <div className={viewerStyles.previewThumbnail} style={{ maxHeight: "320px" }}>
          {resumeContent ? (
            <>
              <div style={{ maxHeight: "320px", overflow: "hidden", background: "white", padding: "0.25rem" }}>
                <ResumeComponent resumeContent={resumeContent} templateId={normalizedId} />
              </div>
              <button type="button" className={viewerStyles.viewBtn} onClick={() => setViewerOpen(true)}>
                <ZoomIn size={12} /> View
              </button>
              <ResumeViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                resumeContent={resumeContent}
                templateId={normalizedId}
                title={job?.title || "Resume"}
              />
            </>
          ) : application.uploadedResume?.pages?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {application.uploadedResume.pages.map((url: string, i: number) => (
                <img key={i} src={url} alt={`Resume page ${i + 1}`} style={{ width: "100%", borderRadius: "6px" }} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", padding: "1rem", textAlign: "center" }}>No resume preview</p>
          )}
        </div>
        <div className={styles.scoreCol} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", minWidth: "120px" }}>
          <ScoreCircle score={score} />
          <span className={`${modalStyles.tierPill} ${tier.cls}`}>{tier.label}</span>
          <span className={modalStyles.tierHint} style={{ textAlign: "center" }}>{tier.hint}</span>
        </div>
      </div>

      {(() => {
        const a = application.jobMatchAnalysis || application.analysisReport;
        if (!a) return null;
        return (
          <>
            <div className={styles.bulletSection}>
              <span className={styles.bulletSectionTitle}>Analysis</span>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.5 }}>{a.verdict || ""}</p>
              {(a.missingKeywords?.length > 0 || a.missingSkills?.length > 0) && (
                <ul className={styles.bulletList}>{[...(a.missingKeywords || []), ...(a.missingSkills || [])].slice(0, 8).map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>
              )}
            </div>
            {a.strengths?.length > 0 && (
              <div className={styles.bulletSection}>
                <span className={styles.bulletSectionTitle}>Strengths</span>
                <ul className={styles.bulletList}>{a.strengths.slice(0, 4).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
            {a.weaknesses?.length > 0 && (
              <div className={styles.bulletSection}>
                <span className={styles.bulletSectionTitle}>Weaknesses</span>
                <ul className={styles.bulletList}>{a.weaknesses.slice(0, 4).map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            {a.gaps?.length > 0 && (
              <div className={styles.bulletSection}>
                <span className={styles.bulletSectionTitle}>Gaps</span>
                <ul className={styles.bulletList}>{a.gaps.slice(0, 4).map((g: string, i: number) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}
            {a.suggestions?.length > 0 && (
              <div className={styles.bulletSection}>
                <span className={styles.bulletSectionTitle}>How to improve</span>
                <ul className={styles.bulletList}>{a.suggestions.slice(0, 4).map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            )}
          </>
        );
      })()}

      {screeningAnswers.length > 0 && (
        <div className={styles.bulletSection}>
          <span className={styles.bulletSectionTitle}>Your answers</span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {screeningAnswers.map((a) => (
              <div key={a.questionId} style={{ fontSize: "var(--text-xs)", color: "var(--gray-700)", background: "var(--gray-50)", padding: "0.5rem", borderRadius: "6px" }}>
                <strong>{a.question}</strong>
                <div>{a.answer || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.bulletSection}>
        <span className={styles.bulletSectionTitle}>Cover letter</span>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", background: "var(--gray-50)", padding: "0.75rem", borderRadius: "6px", whiteSpace: "pre-wrap" }}>{coverLetter || "— No cover letter —"}</p>
      </div>


    </div>
  );
}
