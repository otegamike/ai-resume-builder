"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import ResumeComponent from "@/components/resume/ResumeComponent";
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
  const resumeContent = application.tailoredResumeSnapshot || application.resumeSnapshot || application.tailoredResume || application.resumeContent;
  const templateId = application.tailoredResumeId ? application.tailoredResumeSnapshot?.template || application.templateId || "template1" : application.resumeSnapshot?.template || "template1";
  const normalizedId = templateId ? normalizeTemplateId(templateId) : "template1" as any;
  const score = application.tailoredMatchScore ?? application.matchScore ?? application.analysisReport?.score ?? 0;
  const tier = getTier(score);
  const screeningAnswers: { questionId: string; question: string; answer: string }[] = application.screeningAnswers || [];
  const coverLetter: string = application.coverLetterText || "";
  const status: string = application.status || "submitted";

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

      <div className={styles.grid}>
        <div className={styles.previewBox}>
          {resumeContent ? (
            <ResumeComponent resumeContent={resumeContent} templateId={normalizedId} />
          ) : application.customResumeUrl ? (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", padding: "1rem", textAlign: "center" }}>Uploaded resume (image/PDF) — no structured preview</p>
          ) : (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-500)", padding: "1rem", textAlign: "center" }}>No resume preview</p>
          )}
        </div>
        <div className={styles.scoreCol}>
          <ScoreCircle score={score} />
          <span className={`${modalStyles.tierPill} ${tier.cls}`}>{tier.label} — {score}%</span>
          <span className={modalStyles.tierHint} style={{ textAlign: "center" }}>{tier.hint}</span>
        </div>
      </div>

      {application.analysisReport && (
        <div className={styles.bulletSection}>
          <span className={styles.bulletSectionTitle}>Analysis</span>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)", lineHeight: 1.5 }}>{application.analysisReport.verdict || ""}</p>
          {(application.analysisReport.missingKeywords?.length > 0 || application.analysisReport.missingSkills?.length > 0) && (
            <ul className={styles.bulletList}>{[...(application.analysisReport.missingKeywords || []), ...(application.analysisReport.missingSkills || [])].slice(0, 8).map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>
          )}
        </div>
      )}

      {application.tailorReport && (
        <div className={styles.bulletSection}>
          <span className={styles.bulletSectionTitle}>Tailored improvements</span>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--gray-700)" }}>{application.tailorReport.explanation || ""}</p>
          {application.tailorReport.keyChanges?.length > 0 && (
            <ul className={styles.bulletList}>{application.tailorReport.keyChanges.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
          )}
        </div>
      )}

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

      {application.coverLetterGenerated && <div className={styles.successBanner}><CheckCircle2 size={14} /> AI-generated cover letter</div>}
      {application.tailoredResumeId && <div className={styles.successBanner}><CheckCircle2 size={14} /> Tailored resume was used</div>}
    </div>
  );
}
