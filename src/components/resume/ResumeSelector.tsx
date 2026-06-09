"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileUp,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import ResumeIframe from "./ResumeIframe";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { type TemplateDefinition } from "@/lib/templateCatalog";
import { ResumeContent } from "@/types/ResumeData";
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
  selectedFile: File | null;
  pdfCanvasRefs: HTMLCanvasElement[];
  pdfPreviewUrls: string[];
}

interface ResumeSelectorProps {
  onSelectionChange: (selection: ResumeSelection | null) => void;
  className?: string;
}

function buildResumePreview(resume: SavedResume, templates: TemplateDefinition[]): string {
  const templateId = normalizeTemplateId(resume.template);
  const templateDef = templates.find((t) => t.id === templateId) || templates[0];
  if (templateDef?.html && resume.content) {
    return buildTemplateSrcDoc(templateDef.html, resume.content);
  }
  return "";
}

export default function ResumeSelector({ onSelectionChange, className }: ResumeSelectorProps) {
  const [mode, setMode] = useState<Mode>("saved");
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [error, setError] = useState("");

  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedSavedResume, setSelectedSavedResume] = useState<SavedResume | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [pdfPreviewUrls, setPdfPreviewUrls] = useState<string[]>([]);
  const [pdfFileError, setPdfFileError] = useState("");
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  
  const pdfCanvasRefs = useRef<HTMLCanvasElement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch resumes and templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resumesRes, templatesRes] = await Promise.all([
          fetch("/api/resumes"),
          fetch("/api/templates"),
        ]);
        if (resumesRes.ok) {
          const data = (await resumesRes.json()) as SavedResume[];
          setResumes(data);
        }
        if (templatesRes.ok) {
          const data = (await templatesRes.json()) as TemplateDefinition[];
          setTemplateDefinitions(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load resume options");
      } finally {
        setLoadingResumes(false);
      }
    };

    fetchData();
  }, []);

  // Update parent when selection changes
  useEffect(() => {
    const isImageSelected = !!selectedFile && selectedFile.type.startsWith("image/");
    const hasPdfPreview = pdfPreviewUrls.length > 0;
    const isValid = mode === "saved" ? !!selectedSavedResume : (isImageSelected || hasPdfPreview);

    if (isValid) {
      onSelectionChange({
        mode,
        selectedResumeId,
        selectedSavedResume,
        selectedFile,
        pdfCanvasRefs: pdfCanvasRefs.current,
        pdfPreviewUrls,
      });
    } else {
      onSelectionChange(null);
    }
  }, [mode, selectedResumeId, selectedSavedResume, selectedFile, pdfPreviewUrls, onSelectionChange]);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setError("");
    setSelectedFile(null);
    setPdfPreviewUrls([]);
    setPdfFileError("");
    setIsRenderingPdf(false);
    pdfCanvasRefs.current = [];
    if (newMode === "upload") {
      setSelectedSavedResume(null);
      setSelectedResumeId("");
    }
  }

  function clearFile() {
    setSelectedFile(null);
    setPdfPreviewUrls([]);
    setPdfFileError("");
    setIsRenderingPdf(false);
    pdfCanvasRefs.current = [];
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError("");
    setPdfPreviewUrls([]);
    setPdfFileError("");
    pdfCanvasRefs.current = [];

    if (file && file.type === "application/pdf") {
      setIsRenderingPdf(true);
      renderPdfPreview(file)
        .catch((err) => {
          setPdfFileError(err.message);
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        })
        .finally(() => setIsRenderingPdf(false));
    }
  }

  async function renderPdfPreview(file: File) {
    const pdfjsLib = await import("pdfjs-dist");
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    if (pdf.numPages > 2) {
      throw new Error(
        `PDF has ${pdf.numPages} pages. Maximum of 2 pages is supported.`
      );
    }

    const canvases: HTMLCanvasElement[] = [];
    const urls: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
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

  const isImageSelected = !!selectedFile && selectedFile.type.startsWith("image/");
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
      const renderedTemplate = buildResumePreview(selectedSavedResume, templateDefinitions);
      return (
        <div className={`${styles.previewBox} ${styles.previewBoxActive}`}>
          {renderedTemplate ? (
            <div className={styles.selectedPreviewFrame}>
              <ResumeIframe renderedTemplate={renderedTemplate} type="preview" />
            </div>
          ) : (
            <span className={styles.uploadTitle}>{selectedSavedResume.title}</span>
          )}
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
        {resumes.map((resume) => {
          const renderedTemplate = buildResumePreview(resume, templateDefinitions);
          return (
            <div
              key={resume._id}
              className={styles.resumeCard}
              onClick={() => selectSavedResume(resume)}
            >
              <div className={styles.cardPreview}>
                {renderedTemplate ? (
                  <ResumeIframe renderedTemplate={renderedTemplate} type="preview" />
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
              <div className={styles.cardTitle}>{resume.title}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderUploadContent() {
    if (isImageSelected) {
      return (
        <div className={`${styles.previewBox} ${styles.previewBoxActive}`}>
          <img
            src={URL.createObjectURL(selectedFile)}
            alt="Resume preview"
            className={styles.imgPreview}
          />
          <div className={styles.selectedInfo}>
            <span className={styles.uploadTitle}>{selectedFile.name}</span>
            <button type="button" className={styles.changeButton} onClick={clearFile}>
              Change
            </button>
          </div>
        </div>
      );
    }

    if (hasPdfPreview) {
      return (
        <div className={`${styles.previewBox} ${styles.previewBoxActive}`}>
          <div className={styles.pdfPreviewContainer}>
            {pdfPreviewUrls.map((url, i) => (
              <img key={i} src={url} alt={`PDF page ${i + 1}`} className={styles.pdfCanvas} />
            ))}
          </div>
          <div className={styles.selectedInfo}>
            <span className={styles.uploadTitle}>{selectedFile?.name}</span>
            <button type="button" className={styles.changeButton} onClick={clearFile}>
              Change
            </button>
          </div>
        </div>
      );
    }

    if (isRenderingPdf) {
      return (
        <div className={styles.uploadBox}>
          <Loader2 className={styles.spinner} style={{ width: "2rem", height: "2rem" }} />
          <span className={styles.uploadTitle}>Processing PDF...</span>
          <span className={styles.uploadHint}>Rendering pages locally</span>
        </div>
      );
    }

    return (
      <label className={styles.uploadBox}>
        <input
          ref={fileInputRef}
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
          className={styles.fileInput}
          onChange={handleFileChange}
          type="file"
        />
        <FileUp className={styles.uploadIcon} />
        <span className={styles.uploadTitle}>
          Choose a PDF or image resume
        </span>
        <span className={styles.uploadHint}>
          PDFs are extracted locally. Images are read with vision AI.
        </span>
        {pdfFileError && (
          <span className={styles.pageLimitError}>{pdfFileError}</span>
        )}
      </label>
    );
  }

  return (
    <div className={`${styles.selectorWrapper} ${className || ""}`}>
      <div className={styles.tabs}>
        
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

      <div className={styles.selectorContent}>
        {mode === "upload" ? renderUploadContent() : renderSavedModeContent()}
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
