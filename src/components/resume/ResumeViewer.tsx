"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Download, Loader2 } from "lucide-react";
import { type TemplateId } from "@/lib/templateCatalog";
import { ResumeContent } from "@/types/ResumeData";
import styles from "./ResumeViewer.module.css";
import ResumeExporter, { type ResumeExporterRef } from "./ResumeExporter";
import ResumeComponent from "./ResumeComponent";
import UploadedResumeComponent from "./UploadedResume";

interface ResumeViewerProps {
  resumeContent: ResumeContent;
  templateId: TemplateId;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialZoom?: number;
}

export default function ResumeViewer({ resumeContent, templateId, isOpen, onClose, title, initialZoom = 1.05}: ResumeViewerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exporterRef = useRef<ResumeExporterRef>(null);

  const handleDownload = async () => {
    if (!resumeContent) return;

    setIsExporting(true);

    try {
      const name =
        title ||
        resumeContent.personalInfo.name ||
        "Resume";

      await exporterRef.current?.download(name);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setIsExporting(false);
    }
  };


  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <ResumeViewercard title={title || resumeContent?.personalInfo.name || "Resume Preview"} initialZoom={initialZoom} handleDownload={handleDownload} isOpen={isOpen} isExporting={isExporting} onClose={onClose}>
         <ResumeComponent resumeContent={resumeContent} templateId={templateId} renderOpts={{editorMode: true, showProStatus: true}} />
      </ResumeViewercard>
      <ResumeExporter ref={exporterRef} resumeContent={resumeContent} templateId={templateId} />
    </div>
  );

  return createPortal(content, document.body);
}


interface UploadedResumeViewerProps {
  pages: string[];
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialZoom?: number;
}

export function UploadedResumeViewer({ pages, isOpen, onClose, title, initialZoom = 1.05}: UploadedResumeViewerProps) {
 
  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <ResumeViewercard title={title || "Resume Preview"} initialZoom={initialZoom} isOpen={isOpen} onClose={onClose}>
         <UploadedResumeComponent resumePages={pages} preview={false} />
      </ResumeViewercard>
    </div>
  );

  return createPortal(content, document.body);
}


interface ResumeViewercardProps {
  children: React.ReactNode;
  title: string;
  initialZoom: number;
  handleDownload?: () => void;
  isOpen: boolean;
  isExporting?: boolean;
  onClose: () => void;
}

const ResumeViewercard = ({children, title, initialZoom, handleDownload, isExporting, onClose, isOpen }: ResumeViewercardProps) => {
  const [zoom, setZoom] = useState<number>(initialZoom || 1.05);

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

  return (
    <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>{title || "Resume Preview"}</span>
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

            {handleDownload &&
              <button className={styles.downloadBtn} onClick={handleDownload} disabled={isExporting}>
                {isExporting ? <Loader2 size={14} className={styles.spinner ?? ""} /> : <Download size={14} />} Download
              </button>
            }

            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className={styles.scrollArea} onWheel={handleWheel}>
          <div className={styles.zoomWrapper} style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
            {children}
          </div>
        </div>
      </div>
  )
}