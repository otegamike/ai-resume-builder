import type { ResumeSelection } from "@/components/resume/ResumeSelector";

/**
 * Builds the resume portion of a FormData payload from a ResumeSelector
 * selection. Upload mode is ID-only: the selector processes every file
 * (PDF or image) before consumers see it, so callers never touch file
 * hashes, canvas blobs, or raw files here. Throws when no usable resume
 * reference exists.
 */
export function buildResumeFormData(selection: ResumeSelection): FormData {
  const formData = new FormData();
  formData.append("resumeMode", selection.mode);

  if (selection.mode === "saved") {
    if (!selection.selectedResumeId) {
      throw new Error("Choose a saved resume first.");
    }
    formData.append("resumeId", selection.selectedResumeId);
    return formData;
  }

  if (!selection.uploadedResumeId) {
    throw new Error("Choose a PDF or image resume first.");
  }
  formData.append("uploadedResumeId", selection.uploadedResumeId);
  return formData;
}
