"use client";

import { AlignLeft, FileImage, Upload } from "lucide-react";
import type { UseJobDescriptionInputReturn } from "@/hooks/useJobDescriptionInput";
import styles from "./JobDescriptionInput.module.css";

interface JobDescriptionInputProps {
  job: UseJobDescriptionInputReturn;
  disabled?: boolean;
  textareaId?: string;
}

export default function JobDescriptionInput({ job, disabled, textareaId }: JobDescriptionInputProps) {
  const { jobMode, jobText, setJobText, jobImageUrl, fileInputRef, handleJobModeChange, handleJobImageChange, clearJobImage } = job;

  return (
    <>
      <div className={styles.tabsContainer}>
        <div className={styles.inputTabs}>
          <button
            type="button"
            className={`${styles.inputTab} ${jobMode === "text" ? styles.activeInputTab : ""}`}
            onClick={() => handleJobModeChange("text")}
            disabled={disabled}
          >
            <AlignLeft className={styles.tabIconSmall} />
            Paste Description Text
          </button>
          <button
            type="button"
            className={`${styles.inputTab} ${jobMode === "image" ? styles.activeInputTab : ""}`}
            onClick={() => handleJobModeChange("image")}
            disabled={disabled}
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
              id={textareaId}
              placeholder="Paste the responsibilities, requirements, and keywords from the job posting..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              className={styles.textarea}
              disabled={disabled}
              rows={8}
            />
          </div>
        ) : (
          <div className={styles.uploadContainer}>
            {jobImageUrl ? (
              <div className={styles.jobImagePreviewBox}>
                <img src={jobImageUrl} alt="Job posting preview" className={styles.jobImagePreview} />
                <button type="button" onClick={clearJobImage} className={styles.removeImageBtn} disabled={disabled}>
                  Change Image
                </button>
              </div>
            ) : (
              <label className={styles.jobImageUploadLabel}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleJobImageChange}
                  className={styles.fileInput}
                  disabled={disabled}
                />
                <Upload className={styles.uploadIcon} />
                <span className={styles.uploadTitle}>Choose a job post screenshot</span>
                <span className={styles.uploadHint}>Supports PNG, JPG, JPEG, WEBP files</span>
              </label>
            )}
          </div>
        )}
      </div>
    </>
  );
}
