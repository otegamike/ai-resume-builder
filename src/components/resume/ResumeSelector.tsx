"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileUp,
  FileText,
  Loader2,
  Sparkles,
  Pin,
} from "lucide-react";
import ResumeComponent from "./ResumeComponent";
import ResumePlusViewer, { UploadedResumePlusViewer } from "./ResumePlusViewer";
import { ResumeContent, UploadedResumeClient } from "@/types/ResumeData";
import { MAX_PDF_PAGES_PER_PLAN } from "@/lib/creditCosts";
import { EXTRACTION_VERSION, MAX_PDF_BYTES, MAX_PDF_PAGES } from "@/lib/pdfConstants";
import { hashFile } from "@/lib/hashFile";
import { useTemplateStore } from "@/store/useTemplateStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useUserStore } from "@/store/useUserStore";
import AiAnalysisLoader from "@/components/ui/ai-analysis-loader/AiAnalysisLoader";
import UploadedResumeComponent from "./UploadedResume";
import styles from "./ResumeSelector.module.css";

export interface SavedResume {
  _id: string;
  title: string;
  template: string;
  content: ResumeContent;
}

export type Mode = "upload" | "saved";

export interface ResumeSelection {
  mode: Mode;
  selectedResumeId: string;
  selectedSavedResume: SavedResume | null;
  pdfPreviewUrls: string[];
  resumeContent?: ResumeContent | null;
  uploadedResumeId?: string | null;
  uploadedTitle?: string | null;
}

interface ResumeSelectorProps {
  onSelectionChange: (selection: ResumeSelection | null) => void;
  className?: string;
  uploadOnly?: boolean;
  animatedLoader?: boolean;
  showLoader?: boolean;
}

export default function ResumeSelector({ onSelectionChange, className, uploadOnly, showLoader, animatedLoader }: ResumeSelectorProps) {
  const { data: session } = useSession();
  const plan = session?.user?.subscriptionPlan || "free";
  const maxPdfPages = Math.min(MAX_PDF_PAGES_PER_PLAN[plan] ?? 2, MAX_PDF_PAGES);
  const [mode, setMode] = useState<Mode>(uploadOnly ? "upload" : "saved");
  const templates = useTemplateStore((state) => state.templates);
  const resumes = useResumeStore((state) => state.resumes);
  const loadingResumes = useResumeStore((state) => state.isLoading);
  const storeFetchResumes = useResumeStore((state) => state.fetchResumes);
  const uploadedResumes = useResumeStore((state) => state.uploadedResumes);
  const loadingUploaded = useResumeStore((state) => state.isLoadingUploaded);
  const storeFetchUploaded = useResumeStore((state) => state.fetchUploadedResumes);
  const pinnedResumeId = useUserStore((state) => state.pinnedResumeId);
  const fetchPinnedResume = useUserStore((state) => state.fetchPinnedResume);
  const [error, setError] = useState("");

  const sortedResumes = pinnedResumeId
    ? [...resumes].sort((a, b) => {
        if (a._id === pinnedResumeId) return -1;
        if (b._id === pinnedResumeId) return 1;
        return 0;
      })
    : resumes;

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedSavedResume, setSelectedSavedResume] = useState<SavedResume | null>(null);

  const [pdfPreviewUrls, setPdfPreviewUrls] = useState<string[]>([]);
  const [pdfFileError, setPdfFileError] = useState("");
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const [pdfRenderProgress, setPdfRenderProgress] = useState(0);
  const [isProcessingBackend, setIsProcessingBackend] = useState(false);
  const [cachedResumeContent, setCachedResumeContent] = useState<ResumeContent | null>(null);
  const [cachedUploadedResumeId, setCachedUploadedResumeId] = useState<string | null>(null);
  const [cachedTitle, setCachedTitle] = useState<string | null>(null);
  
  const pdfCanvasRefs = useRef<HTMLCanvasElement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadOnly) return;
    storeFetchResumes().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load resume options");
    });
    fetchPinnedResume();
  }, [storeFetchResumes, fetchPinnedResume, uploadOnly]);

  useEffect(() => {
    storeFetchUploaded().catch(() => undefined);
  }, [storeFetchUploaded]);

  // Update parent when selection changes. Only finished results are emitted:
  // saved resumes pass their ID + content, uploads pass the stored record ID,
  // parsed content, preview images, and title. File handles, canvas refs,
  // hashes, and raw text stay internal to the selector.
  useEffect(() => {
    const hasPdfPreview = pdfPreviewUrls.length > 0;
    const isValid =
      mode === "saved" ? !!selectedSavedResume : hasPdfPreview && !!cachedUploadedResumeId;

    if (isValid) {
      onSelectionChange({
        mode,
        selectedResumeId,
        selectedSavedResume,
        pdfPreviewUrls,
        resumeContent: cachedResumeContent,
        uploadedResumeId: cachedUploadedResumeId,
        uploadedTitle: cachedTitle,
      });
    } else {
      onSelectionChange(null);
    }
  }, [mode, selectedResumeId, selectedSavedResume, pdfPreviewUrls, cachedResumeContent, cachedUploadedResumeId, cachedTitle, onSelectionChange]);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError("");
    setPdfPreviewUrls([]);
    setPdfFileError("");
    setIsRenderingPdf(false);
    setIsProcessingBackend(false);
    setPdfRenderProgress(0);
    setCachedResumeContent(null);
    setCachedUploadedResumeId(null);
    setCachedTitle(null);
    pdfCanvasRefs.current = [];
    if (newMode === "upload") {
      setSelectedSavedResume(null);
      setSelectedResumeId("");
    }
  }

  function clearFile() {
    setPdfPreviewUrls([]);
    setPdfFileError("");
    setIsRenderingPdf(false);
    setIsProcessingBackend(false);
    setPdfRenderProgress(0);
    setCachedResumeContent(null);
    setCachedUploadedResumeId(null);
    setCachedTitle(null);
    pdfCanvasRefs.current = [];
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function applyExtractionData(
    data: { pages?: unknown; resumeContent?: unknown; uploadedResumeId?: unknown; title?: unknown },
    hash: string | null,
    fallbackTitle: string | null
  ) {
    const pages = Array.isArray(data.pages) ? (data.pages as string[]) : [];
    const content = (data.resumeContent as ResumeContent) ?? null;
    const recordId = typeof data.uploadedResumeId === "string" ? data.uploadedResumeId : null;
    const title = typeof data.title === "string" ? data.title : fallbackTitle;
    pdfCanvasRefs.current = [];
    setPdfPreviewUrls(pages);
    setCachedResumeContent(content);
    setCachedUploadedResumeId(recordId);
    setCachedTitle(title);
    if (recordId && content) {
      useResumeStore.getState().upsertUploadedResume({
        _id: recordId,
        title: title || fallbackTitle || "Uploaded Resume",
        pages,
        fileHash: hash ?? undefined,
        extractionVersion: EXTRACTION_VERSION,
        status: "done",
        parsedResume: content,
      });
    }
  }

  function selectUploadedResume(item: UploadedResumeClient) {
    setError("");
    setPdfPreviewUrls([]);
    setPdfFileError("");
    pdfCanvasRefs.current = [];
    if (item.parsedResume) {
      applyExtractionData(
        { pages: item.pages, resumeContent: item.parsedResume, uploadedResumeId: item._id, title: item.title },
        item.fileHash ?? null,
        item.title
      );
      return;
    }
    if (!item.fileHash) return;
    setIsRenderingPdf(true);
    setIsProcessingBackend(true);
    (async () => {
      const res = await fetch("/api/resume/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileHash: item.fileHash }),
      });
      if (!res.ok) throw new Error("Failed to load uploaded resume");
      const data = await res.json();
      if (data?.status !== "done") throw new Error("Resume is no longer available");
      applyExtractionData(data, item.fileHash ?? null, item.title);
    })()
      .catch(() => {
        if (item._id) useResumeStore.getState().removeUploadedResume(item._id);
        setPdfFileError("That resume is no longer available. Please upload it again.");
      })
      .finally(() => {
        setIsRenderingPdf(false);
        setIsProcessingBackend(false);
      });
  }

  async function pollLookupForDone(hash: string, signal: AbortSignal): Promise<boolean> {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if (signal.aborted) return false;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (signal.aborted) return false;
      try {
        const res = await fetch("/api/resume/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileHash: hash }),
          signal,
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (data?.status === "done") {
          applyExtractionData(data, hash, null);
          return true;
        }
        if (data?.status !== "pending") return false;
      } catch {
        if (signal.aborted) return false;
      }
    }
    return false;
  }

  async function submitProcessFormData(formData: FormData, hash: string, fallbackTitle: string, signal: AbortSignal) {
    setIsProcessingBackend(true);
    try {
      const res = await fetch("/api/resume/process", { method: "POST", body: formData, signal });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || data?.status === "pending") {
        const done = await pollLookupForDone(hash, signal);
        if (!done && !signal.aborted) {
          setPdfFileError("Extraction is still running. Please reselect the file in a moment.");
        }
        return;
      }
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Failed to process resume");
      applyExtractionData(data, hash, fallbackTitle);
    } catch (err) {
      if (signal.aborted) return;
      throw err instanceof Error ? err : new Error("Failed to process resume");
    } finally {
      if (!signal.aborted) setIsProcessingBackend(false);
    }
  }

  async function processPdfWithBackend(file: File, hash: string, canvases: HTMLCanvasElement[], signal: AbortSignal) {
    const formData = new FormData();
    formData.append("fileHash", hash);
    formData.append("title", file.name);
    for (const canvas of canvases) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
      if (blob) formData.append("resumeFile", blob, "page.png");
    }
    await submitProcessFormData(formData, hash, file.name, signal);
  }

  async function processImageWithBackend(file: File, hash: string, signal: AbortSignal) {
    const formData = new FormData();
    formData.append("fileHash", hash);
    formData.append("title", file.name);
    formData.append("resumeFile", file);
    await submitProcessFormData(formData, hash, file.name, signal);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setPdfPreviewUrls([]);
    setPdfFileError("");
    setCachedResumeContent(null);
    setCachedUploadedResumeId(null);
    setCachedTitle(file?.name ?? null);
    pdfCanvasRefs.current = [];

    const isPdf = !!file && file.type === "application/pdf";
    const isImage = !!file && file.type.startsWith("image/");
    if (!file || (!isPdf && !isImage)) return;

    if (file.size > MAX_PDF_BYTES) {
      setPdfFileError(`Please upload a PDF under 10 MB and up to ${maxPdfPages} pages.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const controller = new AbortController();
    setIsRenderingPdf(true);
    setPdfRenderProgress(0);
    (async () => {
      const hash = await hashFile(file);
      if (controller.signal.aborted) return;
      const cached = useResumeStore.getState().uploadedResumes.find(
        (r) => r.fileHash === hash && r.extractionVersion === EXTRACTION_VERSION && r.status === "done"
      );
      if (cached?.parsedResume) {
        applyExtractionData(
          { pages: cached.pages, resumeContent: cached.parsedResume, uploadedResumeId: cached._id, title: cached.title },
          hash,
          file.name
        );
        return;
      }
      try {
        const lookupRes = await fetch("/api/resume/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileHash: hash }),
          signal: controller.signal,
        });
        if (lookupRes.ok) {
          const lookup = await lookupRes.json();
          if (lookup?.status === "done") {
            applyExtractionData(lookup, hash, file.name);
            return;
          }
          if (lookup?.status === "pending") {
            const done = await pollLookupForDone(hash, controller.signal);
            if (done) return;
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (isImage) {
        await processImageWithBackend(file, hash, controller.signal);
        return;
      }
      await renderPdfPreview(file);
      if (controller.signal.aborted) return;
      if (pdfCanvasRefs.current.length > 0) {
        await processPdfWithBackend(file, hash, [...pdfCanvasRefs.current], controller.signal);
      }
    })()
      .catch((err) => {
        if (controller.signal.aborted) return;
        setPdfFileError(err instanceof Error ? err.message : "Failed to process PDF");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsRenderingPdf(false);
      });
  }

  async function renderPdfPreview(file: File) {
    const pdfjsLib = await import("pdfjs-dist");
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    }

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    if (pdf.numPages > maxPdfPages) {
      throw new Error(
        `Please upload a PDF under 10 MB and up to ${maxPdfPages} pages.`
      );
    }

    const canvases: HTMLCanvasElement[] = [];
    const urls: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      setPdfRenderProgress(i);
      await new Promise(resolve => setTimeout(resolve, 0));
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      canvases.push(canvas);
      urls.push(canvas.toDataURL("image/png"));
    }

    pdfCanvasRefs.current = canvases;
    setPdfPreviewUrls(urls);
  }

  function selectSavedResume(resume: SavedResume) {
    setSelectedSavedResume(resume);
    setSelectedResumeId(resume._id);
    setError("");
  }

  function clearSelection() {
    setSelectedSavedResume(null);
    setSelectedResumeId("");
    setError("");
  }

  const hasPdfPreview = pdfPreviewUrls.length > 0;

  function renderSavedModeContent() {
    if (loadingResumes) {
      return (
        <div className={styles.emptyState}>
          <Loader2 className={styles.spinner} />
          <span>Loading your resumes...</span>
        </div>
      );
    }

    if (resumes.length === 0) {
      return (
        <div className={styles.emptyState}>
          <FileText size={32} />
          <span>No saved resumes yet.</span>
          <Link href="/editor/new" className={styles.emptyStateLink}>
            Create your first resume
          </Link>
        </div>
      );
    }

    if (selectedSavedResume) {
      return (
        <div className={`${styles.previewBox} ${styles.previewBoxActive}`}>
          <AnimatedLoader showLoader={showLoader} animatedLoader={animatedLoader}>
            {templates.length > 0 ? (
              <div className={styles.selectedPreviewFrame}>
                <ResumePlusViewer
                  title={selectedSavedResume.title}
                  content={selectedSavedResume.content}
                  templateId={selectedSavedResume.template}
                />
              </div>
            ) : (
              <span className={styles.uploadTitle}>{selectedSavedResume.title}</span>
            )}
          </AnimatedLoader>
          <div className={styles.selectedInfo}>
            <span className={styles.uploadTitle}>{selectedSavedResume.title}</span>
            <button type="button" className={styles.changeButton} onClick={clearSelection}>
              Change
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.horizontalScroll}>
        {sortedResumes.map((resume) => {
          const isPinned = resume._id === pinnedResumeId;
          return (
            <div
              key={resume._id}
              className={styles.resumeCard}
              onClick={() => selectSavedResume(resume)}
            >
              <div className={styles.cardPreview}>
                {templates.length > 0 ? (
                  <ResumeComponent
                    resumeContent={resume.content}
                    templateId={resume.template}
                  />
                ) : (
                  <div
                    style={{
                      padding: "var(--space-3)",
                      color: "var(--gray-500)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    No preview
                  </div>
                )}
              </div>
              {isPinned && <Pin className={styles.actionButtonSvg} style={{ fill: "var(--neutral-700)", color: "var(--neutral-700)" }} />}
              <div className={styles.cardTitle}>{resume.title}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderUploadContent() {
    if (hasPdfPreview) {
      return (
        <div className={`${styles.previewBox} ${styles.previewBoxActive}`}>
          <AnimatedLoader showLoader={showLoader} animatedLoader={animatedLoader}>
            <UploadedResumePlusViewer resume={{
              _id: cachedUploadedResumeId ?? undefined,
              title: cachedTitle || "Uploaded Resume",
              pages: pdfPreviewUrls,
              ...(cachedResumeContent ? { parsedResume: cachedResumeContent } : {}),
            }} />
          </AnimatedLoader>
          <div className={styles.selectedInfo}>
            <span className={styles.uploadTitle}>{cachedTitle || "Uploaded Resume"}</span>
            <button type="button" className={styles.changeButton} onClick={clearFile}>
              Change
            </button>
          </div>
        </div>
      );
    }

    if (isRenderingPdf || isProcessingBackend) {
      return (
        <div className={styles.uploadBox}>
          <span className={styles.uploadTitle}>
            {isProcessingBackend
              ? "Extracting your resume…"
              : pdfRenderProgress === 0
                ? "Preparing your PDF…"
                : `Processing page ${pdfRenderProgress} of ${maxPdfPages}…`}
          </span>
          <div className={styles.progressBar}>
            <div
              className={pdfRenderProgress === 0 ? styles.progressIndeterminate : styles.progressFill}
              style={pdfRenderProgress > 0 ? { width: `${(pdfRenderProgress / maxPdfPages) * 100}%` } : undefined}
            />
          </div>
          <span className={styles.uploadHint}>Your file stays on your device</span>
        </div>
      );
    }

    return (
      <div className={styles.uploadTab}>
        {uploadedResumes.length > 0 && (
          <div>
            <span className={styles.uploadTitle}>
              Recent uploads
            </span>
            <div className={styles.horizontalScroll}>
              {uploadedResumes.map((item) => (
                <div
                  key={item._id ?? item.fileHash}
                  className={`${styles.resumeCard} ${cachedUploadedResumeId && item._id === cachedUploadedResumeId ? styles.selectedCard : ""}`}
                  onClick={() => selectUploadedResume(item)}
                >
                  <div className={styles.cardPreview}>
                    {item.pages.length > 0 ? (
                      <UploadedResumeComponent resume={item} preview={true} />
                    ) : (
                      <div className={styles.noPreview}>No preview</div>
                    )}
                  </div>
                  <div className={styles.cardTitle}>{item.title}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {loadingUploaded && uploadedResumes.length === 0 && (
          <div className={styles.emptyState}>
            <Loader2 className={styles.spinner} />
            <span>Loading your uploads...</span>
          </div>
        )}
        <label className={styles.uploadBox}>
          <input
            ref={fileInputRef}
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className={styles.fileInput}
            onChange={handleFileChange}
            type="file"
          />
          <FileUp className={styles.uploadIcon} />
          <div className={styles.uploadText}>
            <span className={styles.uploadTitle}>
              Upload from your device
            </span>
            <span className={styles.uploadHint}>
              PDF (up to {maxPdfPages} pages) or image
            </span>
          </div>
          
          {pdfFileError && (
            <span className={styles.pageLimitError}>{pdfFileError}</span>
          )}
        </label>
      </div>
    );
  }

  return (
    <div className={`${styles.selectorWrapper} ${className || ""}`}>
        {!uploadOnly && <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "saved" ? styles.activeTab : ""}`}
            onClick={() => switchMode("saved")}
            type="button"
          >
            <Sparkles className={styles.tabIcon} />
            My Resumes
          </button>
          <button
            className={`${styles.tab} ${mode === "upload" ? styles.activeTab : ""}`}
            onClick={() => switchMode("upload")}
            type="button"
          >
            <FileUp className={styles.tabIcon} />
            Upload resume
          </button>
        </div> 
      }

      <div className={styles.selectorContent}>
        { uploadOnly? renderUploadContent() :  mode === "upload" ? renderUploadContent() : renderSavedModeContent()}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

interface AnimatedLoaderProps {
  showLoader?: boolean;
  animatedLoader?: boolean;
  children: React.ReactNode;
}

function AnimatedLoader({ showLoader, animatedLoader, children }: AnimatedLoaderProps) {
  return (
    <div className={styles.previewWrapper}>
      {children}
      {animatedLoader && showLoader && (
          <div className={styles.loadingComponent}>
            <AiAnalysisLoader />
          </div>
        )}
    </div>
  );
}
