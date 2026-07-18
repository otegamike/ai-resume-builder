"use client";

import { useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileImage,
  AlignLeft,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { AiButton } from "@/components/ui/AiButton";
import { CREDIT_COST } from "@/lib/creditCosts";
import ResumeSelector, { ResumeSelection } from "@/components/resume/ResumeSelector";
import styles from "@/app/dashboard/applications/page.module.css";

type JobInputMode = "text" | "image";
type ProgressState = "idle" | "extracting" | "generating" | "ready";

const progressCopy: Record<ProgressState, string> = {
  idle: "Select a resume and enter job details to begin.",
  extracting: "Reading CV and job description...",
  generating: "Tailoring resume and writing cover letter...",
  ready: "Application materials are ready.",
};

interface CreateApplicationFormProps {
  selection: ResumeSelection | null;
  onSelectionChange: (selection: ResumeSelection | null) => void;
  jobMode: JobInputMode;
  onJobModeChange: (mode: JobInputMode) => void;
  jobText: string;
  onJobTextChange: (text: string) => void;
  jobImage: File | null;
  jobImageUrl: string | null;
  onJobImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearJobImage: () => void;
  targetCompany: string;
  onTargetCompanyChange: (company: string) => void;
  targetRole: string;
  onTargetRoleChange: (role: string) => void;
  showAdditional: boolean;
  onShowAdditionalChange: (show: boolean) => void;
  isBusy: boolean;
  progress: ProgressState;
  canGenerate: boolean;
  onGenerate: () => void;
  error: string;
}

export default function CreateApplicationForm({
  selection,
  onSelectionChange,
  jobMode,
  onJobModeChange,
  jobText,
  onJobTextChange,
  jobImage,
  jobImageUrl,
  onJobImageChange,
  onClearJobImage,
  targetCompany,
  onTargetCompanyChange,
  targetRole,
  onTargetRoleChange,
  showAdditional,
  onShowAdditionalChange,
  isBusy,
  progress,
  canGenerate,
  onGenerate,
  error,
}: CreateApplicationFormProps) {
  const jobFileInputRef = useRef<HTMLInputElement>(null);

  function handleClearJobImage() {
    onClearJobImage();
    if (jobFileInputRef.current) {
      jobFileInputRef.current.value = "";
    }
  }

  return (
    <div className={styles.tabContent}>
      <section className={styles.guideCard}>
        <h2 className={styles.guideTitle}>How it works</h2>
        <div className={styles.guideSteps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <div>
              <h3>Select Resume</h3>
              <p>Pick a saved CV or upload a PDF/Image of your resume.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <div>
              <h3>Add Job Details</h3>
              <p>Paste the job description or upload a screenshot. Add optional metadata.</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <div>
              <h3>Generate &amp; Apply</h3>
              <p>Get a tailored resume and cover letter. Copy the letter and export your resume.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.formSectionTitle}>Select your base resume</h2>
        </div>
        <ResumeSelector onSelectionChange={onSelectionChange} />

        <hr className={styles.divider} />

        <div className={styles.sectionHeader}>
          <h2 className={styles.formSectionTitle}>Job Description</h2>
        </div>

        <div className={styles.tabsContainer}>
          <div className={styles.inputTabs}>
            <button
              type="button"
              className={`${styles.inputTab} ${jobMode === "text" ? styles.activeInputTab : ""}`}
              onClick={() => onJobModeChange("text")}
              disabled={isBusy}
            >
              <AlignLeft className={styles.tabIconSmall} />
              Paste Description Text
            </button>
            <button
              type="button"
              className={`${styles.inputTab} ${jobMode === "image" ? styles.activeInputTab : ""}`}
              onClick={() => onJobModeChange("image")}
              disabled={isBusy}
            >
              <FileImage className={styles.tabIconSmall} />
              Upload Post Image
            </button>
          </div>
        </div>

        <div className={styles.inputBody}>
          {jobMode === "text" ? (
            <div className={styles.field}>
              <textarea
                placeholder="Paste the responsibilities, requirements, and keywords from the job posting..."
                value={jobText}
                onChange={(e) => onJobTextChange(e.target.value)}
                className={styles.textarea}
                disabled={isBusy}
                rows={8}
              />
            </div>
          ) : (
            <div className={styles.uploadContainer}>
              {jobImageUrl ? (
                <div className={styles.jobImagePreviewBox}>
                  <img src={jobImageUrl} alt="Job posting preview" className={styles.jobImagePreview} />
                  <button type="button" onClick={handleClearJobImage} className={styles.removeImageBtn} disabled={isBusy}>
                    Change Image
                  </button>
                </div>
              ) : (
                <label className={styles.jobImageUploadLabel}>
                  <input
                    ref={jobFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={onJobImageChange}
                    className={styles.fileInput}
                    disabled={isBusy}
                  />
                  <Upload className={styles.uploadIcon} />
                  <span className={styles.uploadTitle}>Choose a job post screenshot</span>
                  <span className={styles.uploadHint}>Supports PNG, JPG, JPEG, WEBP files</span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className={styles.collapsibleSection}>
          <button
            type="button"
            className={styles.collapsibleToggle}
            onClick={() => onShowAdditionalChange(!showAdditional)}
            disabled={isBusy}
          >
            <span>Additional Information</span>
            {showAdditional ? (
              <ChevronUp className={styles.chevronIcon} />
            ) : (
              <ChevronDown className={styles.chevronIcon} />
            )}
          </button>
          {showAdditional && (
            <div className={styles.collapsibleBody}>
              <div className={styles.metadataRow}>
                <div className={styles.field}>
                  <label htmlFor="targetCompany" className={styles.label}>
                    Target Company <span className={styles.optionalText}>(optional)</span>
                  </label>
                  <input
                    id="targetCompany"
                    type="text"
                    placeholder="e.g. Google"
                    value={targetCompany}
                    onChange={(e) => onTargetCompanyChange(e.target.value)}
                    className={styles.input}
                    disabled={isBusy}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="targetRole" className={styles.label}>
                    Target Role <span className={styles.optionalText}>(optional)</span>
                  </label>
                  <input
                    id="targetRole"
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={targetRole}
                    onChange={(e) => onTargetRoleChange(e.target.value)}
                    className={styles.input}
                    disabled={isBusy}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.progress}>
            {isBusy ? (
              <Loader2 className={styles.spinner} />
            ) : progress === "ready" ? (
              <CheckCircle2 className={styles.readyIcon} />
            ) : null}
            <span>{progressCopy[progress]}</span>
          </div>
          <AiButton fullWidth variant="primary" disabled={!canGenerate} onClick={onGenerate} cost={CREDIT_COST.quickApply}>
            Generate Application
          </AiButton>
        </div>
      </section>

      {error && (
        <div className={styles.error} role="alert">
          <AlertTriangle className={styles.errorIcon} />
          {error}
        </div>
      )}
    </div>
  );
}
