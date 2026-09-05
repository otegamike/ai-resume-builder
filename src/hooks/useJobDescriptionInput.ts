"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type JobInputMode = "text" | "image";

export interface UseJobDescriptionInputReturn {
  jobMode: JobInputMode;
  jobText: string;
  setJobText: (value: string) => void;
  jobImage: File | null;
  jobImageUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleJobModeChange: (mode: JobInputMode) => void;
  handleJobImageChange: (e: React.ChangeEvent<HTMLInputElement>) => string | null;
  clearJobImage: () => void;
  hasJobContext: boolean;
  reset: () => void;
  appendToFormData: (formData: FormData) => void;
}

export function useJobDescriptionInput(initialMode: JobInputMode = "text"): UseJobDescriptionInputReturn {
  const [jobMode, setJobMode] = useState<JobInputMode>(initialMode);
  const [jobText, setJobText] = useState("");
  const [jobImage, setJobImage] = useState<File | null>(null);
  const [jobImageUrl, setJobImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (jobImageUrl) URL.revokeObjectURL(jobImageUrl);
    };
  }, [jobImageUrl]);

  const handleJobImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): string | null => {
      const file = e.target.files?.[0] ?? null;

      if (jobImageUrl) {
        URL.revokeObjectURL(jobImageUrl);
        setJobImageUrl(null);
      }

      if (!file) {
        setJobImage(null);
        return null;
      }

      if (!file.type.startsWith("image/")) {
        setJobImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return "Please upload an image file (PNG, JPG, JPEG, or WEBP).";
      }

      setJobImage(file);
      setJobImageUrl(URL.createObjectURL(file));
      return null;
    },
    [jobImageUrl]
  );

  const clearJobImage = useCallback(() => {
    setJobImage(null);
    if (jobImageUrl) {
      URL.revokeObjectURL(jobImageUrl);
      setJobImageUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [jobImageUrl]);

  const handleJobModeChange = useCallback((mode: JobInputMode) => {
    setJobMode(mode);
  }, []);

  const reset = useCallback(() => {
    setJobMode("text");
    setJobText("");
    setJobImage(null);
    if (jobImageUrl) {
      URL.revokeObjectURL(jobImageUrl);
      setJobImageUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [jobImageUrl]);

  const appendToFormData = useCallback(
    (formData: FormData) => {
      formData.append("jobMode", jobMode);
      if (jobMode === "text") {
        formData.append("jobText", jobText);
      } else if (jobImage) {
        formData.append("jobImage", jobImage);
      }
    },
    [jobMode, jobText, jobImage]
  );

  const hasJobContext = jobMode === "text" ? !!jobText.trim() : !!jobImage;

  return {
    jobMode,
    jobText,
    setJobText,
    jobImage,
    jobImageUrl,
    fileInputRef,
    handleJobModeChange,
    handleJobImageChange,
    clearJobImage,
    hasJobContext,
    reset,
    appendToFormData,
  };
}
