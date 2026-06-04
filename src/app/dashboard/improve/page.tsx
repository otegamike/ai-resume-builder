"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AtsIssue, AtsReport } from "@/types/AtsReport";
import { ResumeContent } from "@/types/ResumeData";
import ResumeIframe from "@/components/resume/ResumeIframe";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { type TemplateDefinition } from "@/lib/templateCatalog";
import styles from "./page.module.css";
import ScoreCircle from "@/components/ui/score-circle/ScoreCircle";
import { CircleCheck } from "lucide-react";

interface SavedResume {
  _id: string;
  title: string;
  template: string;
  content: ResumeContent;
}

type Mode = "upload" | "saved";
type ProgressState = "idle" | "extracting" | "analyzing" | "improving" | "ready";

const progressCopy: Record<ProgressState, string> = {
  idle: "Choose a resume to begin.",
  extracting: "Extracting resume text...",
  analyzing: "Running ATS checks...",
  improving: "Preparing improved CV content...",
  ready: "ATS report is ready.",
};

function severityClass(issue: AtsIssue) {
  if (issue.severity === "high") return styles.highSeverity;
  if (issue.severity === "medium") return styles.mediumSeverity;
  return styles.lowSeverity;
}

function buildResumePreview(resume: SavedResume, templates: TemplateDefinition[]): string {
  const templateId = normalizeTemplateId(resume.template);
  const templateDef = templates.find((t) => t.id === templateId) || templates[0];
  if (templateDef?.html && resume.content) {
    return buildTemplateSrcDoc(templateDef.html, resume.content);
  }
  return "";
}

export default function ImproveResumePage() {
  const router = useRouter();
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>("saved");
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [selectedSavedResume, setSelectedSavedResume] = useState<SavedResume | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<AtsReport | null>(null);
  const [progress, setProgress] = useState<ProgressState>("idle");
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [pdfPreviewUrls, setPdfPreviewUrls] = useState<string[]>([]);
  const [pdfFileError, setPdfFileError] = useState("");
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  const pdfCanvasRefs = useRef<HTMLCanvasElement[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      window.location.href = "/";
      return;
    }

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
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoadingResumes(false);
      }
    };

    fetchData();
  }, [status]);

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setReport(null);
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
    setReport(null);
    setError("");
    setProgress("idle");
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
    setReport(null);
    setError("");
    setProgress("idle");
  }

  function clearSelection() {
    setSelectedSavedResume(null);
    setSelectedResumeId("");
    setReport(null);
    setError("");
    setProgress("idle");
  }

  async function runAnalysis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReport(null);
    setProgress("extracting");

    try {
      let response: Response;

      if (mode === "upload") {
        const formData = new FormData();

        if (selectedFile && selectedFile.type.startsWith("image/")) {
          formData.append("file", selectedFile);
        } else if (pdfCanvasRefs.current.length > 0) {
          for (const canvas of pdfCanvasRefs.current) {
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), "image/png")
            );
            if (blob) {
              formData.append("file", blob, "page.png");
            }
          }
        } else {
          throw new Error("Choose a PDF or image resume first.");
        }

        response = await fetch("/api/resume-improver/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        if (!selectedResumeId) throw new Error("Choose a saved resume first.");
        setProgress("analyzing");
        response = await fetch(`/api/resume-improver/resume/${selectedResumeId}`, {
          method: "POST",
        });
      }

      setProgress("analyzing");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze resume");
      }

      setProgress("improving");
      setReport(data as AtsReport);
      setProgress("ready");
    } catch (err) {
      setProgress("idle");
      setError(err instanceof Error ? err.message : "Failed to analyze resume");
    }
  }

  async function createImprovedResume() {
    if (!report) return;
    setCreating(true);
    setError("");

    try {
      const sourceResume = resumes.find((resume) => resume._id === selectedResumeId);
      const response = await fetch("/api/resume-improver/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${sourceResume?.title || report.improvedResume.personalInfo.name || "Resume"} - Improved`,
          template: sourceResume?.template || "template1",
          improvedResume: report.improvedResume,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create improved CV");
      }

      router.push(`/editor/${String(data.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create improved CV");
    } finally {
      setCreating(false);
    }
  }

  const isBusy = progress !== "idle" && progress !== "ready";
  const highIssues = report?.issues.filter((issue) => issue.severity === "high").length ?? 0;
  const hasPdfPreview = pdfPreviewUrls.length > 0;
  const isImageSelected = !!selectedFile && selectedFile.type.startsWith("image/");
  const canSubmit =
    mode === "saved" ? !!selectedSavedResume : !!isImageSelected || hasPdfPreview;

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
          <a href="/editor/new" className={styles.emptyStateLink}>
            Create your first resume
          </a>
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
          PDFs are extracted locally. Images are read with Groq vision.
        </span>
        {pdfFileError && (
          <span className={styles.pageLimitError}>{pdfFileError}</span>
        )}
      </label>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>ATS improver</p>
          <h1 className={styles.title}>Improve an existing resume</h1>
          <p className={styles.subtitle}>
            Upload a CV or review one already created here. We will flag ATS
            issues and prepare an improved editable version.
          </p>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "upload" ? styles.activeTab : ""}`}
            onClick={() => switchMode("upload")}
            type="button"
          >
            <FileUp className={styles.tabIcon} />
            Upload resume
          </button>
          <button
            className={`${styles.tab} ${mode === "saved" ? styles.activeTab : ""}`}
            onClick={() => switchMode("saved")}
            type="button"
          >
            <Sparkles className={styles.tabIcon} />
            Use my resumes
          </button>
        </div>

        <form className={styles.form} onSubmit={runAnalysis}>
          {mode === "upload" ? renderUploadContent() : renderSavedModeContent()}

          <div className={styles.actions}>
            <div className={styles.progress}>
              {isBusy ? (
                <Loader2 className={styles.spinner} />
              ) : (
                <CheckCircle2 className={styles.readyIcon} />
              )}
              <span>{progressCopy[progress]}</span>
            </div>
            <Button disabled={isBusy || !canSubmit} type="submit">
              Run ATS review
            </Button>
          </div>
        </form>

        {error && (
          <div className={styles.error} role="alert">
            <AlertTriangle className={styles.errorIcon} />
            {error}
          </div>
        )}
      </section>

      {report && (
        <section className={styles.reportGrid}>
          <article className={styles.scorePanel}>
            <ScoreCircle score={report.score} />
            <div>
              <h2 className={styles.sectionTitle}>ATS rating</h2>
              <p className={styles.verdict}>{report.verdict}</p>
              <p className={styles.issueCount}>
                {highIssues} high-priority issue{highIssues === 1 ? "" : "s"} found
              </p>
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Strengths</h2>
            <ul className={styles.cleanList}>
              {report.strengths.map((strength, index) => (
                <li key={`${strength}-${index}`}>
                  <CircleCheck size={25} className={styles.checkIcon} />
                  {strength}
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Recommended keywords</h2>
            <div className={styles.keywordList}>
              {report.recommendedKeywords.map((keyword, index) => (
                <span key={`${keyword}-${index}`} className={styles.keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </article>

          <article className={styles.wideCard}>
            <h2 className={styles.sectionTitle}>Flagged ATS issues</h2>
            <div className={styles.issueList}>
              {report.issues.map((issue, index) => (
                <div
                  key={`${issue.title}-${index}`}
                  className={`${styles.issue} ${issue.severity === "high" ? styles.highIssue : issue.severity === "medium" ? styles.mediumIssue : styles.lowIssue}`}
                >
                  <div className={styles.issueHeader}>
                    <h3>{issue.title}</h3>
                    <span className={`${styles.severity} ${severityClass(issue)}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p>{issue.detail}</p>
                  <strong>{issue.suggestion}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card}>
            <h2 className={styles.sectionTitle}>Improved CV preview</h2>
            <div className={styles.previewBlock}>
              <h3>{report.improvedResume.personalInfo.name || "Unnamed candidate"}</h3>
              <p>{report.improvedResume.personalInfo.jobTitle}</p>
              <p>{report.improvedResume.summary}</p>
              <div className={styles.keywordList}>
                {report.improvedResume.skills.slice(0, 10).map((skill, index) => (
                  <span key={`${skill}-${index}`} className={styles.keyword}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <Button disabled={creating} onClick={createImprovedResume} fullWidth>
              {creating ? "Creating improved CV..." : "Create improved CV"}
            </Button>
          </article>

          <article className={styles.card}>
            <details className={styles.details}>
              <summary>Extracted text</summary>
              <pre>{report.extractedText}</pre>
            </details>
          </article>
        </section>
      )}
    </div>
  );
}
