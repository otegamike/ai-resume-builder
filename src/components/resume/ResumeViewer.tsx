"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Download, Loader2 } from "lucide-react";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { type TemplateId } from "@/lib/templateCatalog";
import { useTemplateStore } from "@/store/useTemplateStore";
import { ResumeContent } from "@/types/ResumeData";
import ResumeIframe from "./ResumeIframe";
import styles from "./ResumeViewer.module.css";
import { exportResumeAsPdf, exportResumeAsImage } from "@/utils/exportUtils";
import { exportResumeAsAtsPdf } from "@/utils/atsExportUtils";
import { TEMPLATE_PAGE } from "@/lib/templateCatalog";
import { mapResumeToAtsView } from "@/lib/atsResumeMapper";

interface ResumeViewerProps {
  resumeContent: ResumeContent | null;
  templateId: TemplateId;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialZoom?: number;
}

export default function ResumeViewer({ resumeContent, templateId, isOpen, onClose, title, initialZoom = 1.05 }: ResumeViewerProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [isExporting, setIsExporting] = useState(false);
  const exportIframeRef = useRef<HTMLIFrameElement | null>(null);
  const html = useTemplateStore((s) => s.getTemplateById(templateId)?.html) ?? "";

  const renderedTemplate = useMemo(() => {
    if (!html || !resumeContent) return "";
    return buildTemplateSrcDoc(html, resumeContent, { editorMode: true });
  }, [html, resumeContent]);

  const atsViewData = useMemo(() => {
    if (!templateId.startsWith("ats-") || !resumeContent) return null;
    return mapResumeToAtsView(resumeContent);
  }, [templateId, resumeContent]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(1.75, +(z + 0.1).toFixed(2)));
      if (e.key === "-") setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom, isOpen]);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        const next = e.deltaY < 0 ? z + 0.05 : z - 0.05;
        return Math.min(1.75, Math.max(0.5, +next.toFixed(2)));
      });
    }
  };

  const handleDownload = async () => {
    if (!resumeContent) return;
    setIsExporting(true);
    try {
      const name = title || resumeContent.personalInfo.name || "Resume";
      if (templateId.startsWith("ats-") && atsViewData) {
        await exportResumeAsAtsPdf(name, resumeContent, templateId);
      } else {
        const iframe = exportIframeRef.current;
        if (iframe && renderedTemplate) {
          const doc = iframe.contentDocument;
          if (doc) {
            doc.open();
            doc.write(renderedTemplate);
            doc.close();
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        await exportResumeAsPdf(exportIframeRef as React.RefObject<HTMLIFrameElement>, name, TEMPLATE_PAGE.widthPx, TEMPLATE_PAGE.heightPx);
      }
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>{title || resumeContent?.personalInfo.name || "Resume Preview"}</span>
          <div className={styles.headerActions}>
            <div className={styles.zoomGroup}>
              <button className={styles.zoomBtn} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} disabled={zoom <= 0.5} aria-label="Zoom out">
                <ZoomOut size={14} />
              </button>
              <span className={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
              <button className={styles.zoomBtn} onClick={() => setZoom((z) => Math.min(1.75, +(z + 0.1).toFixed(2)))} disabled={zoom >= 1.75} aria-label="Zoom in">
                <ZoomIn size={14} />
              </button>
            </div>
            <button className={styles.zoomBtn} onClick={() => setZoom(0.85)} aria-label="Fit">
              Fit
            </button>
            <button className={styles.downloadBtn} onClick={handleDownload} disabled={isExporting || !resumeContent}>
              {isExporting ? <Loader2 size={14} className={styles.spinner ?? ""} /> : <Download size={14} />} Download
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className={styles.scrollArea} onWheel={handleWheel}>
          <div className={styles.zoomWrapper} style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            {renderedTemplate ? <ResumeIframe renderedTemplate={renderedTemplate} type="preview" editorMode /> : <p style={{ padding: "2rem", textAlign: "center", color: "var(--gray-500)" }}>No preview available</p>}
          </div>
        </div>
        <iframe ref={exportIframeRef} title="export-hidden" style={{ position: "absolute", left: "-10000px", top: 0, width: "794px", height: "5000px", border: 0, visibility: "hidden" }} sandbox="allow-same-origin" />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export function ResumePreviewWithViewer({
  resumeContent,
  templateId,
  title,
}: {
  resumeContent: ResumeContent;
  templateId: TemplateId;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={styles.previewThumbnail}>
        <div style={{ maxHeight: "320px", overflow: "hidden", background: "white", padding: "0.25rem" }}>
          <ResumeIframe renderedTemplate={buildTemplateSrcDoc(useTemplateStore.getState().getTemplateById(templateId)?.html ?? "", resumeContent)} type="preview" />
        </div>
        <button type="button" className={styles.viewBtn} onClick={() => setOpen(true)}>
          <ZoomIn size={12} /> View
        </button>
      </div>
      <ResumeViewer isOpen={open} onClose={() => setOpen(false)} resumeContent={resumeContent} templateId={templateId} title={title} />
    </>
  );
}
