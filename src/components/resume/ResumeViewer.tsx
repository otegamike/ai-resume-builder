"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Download, Loader2 } from "lucide-react";
import { type TemplateId } from "@/lib/templateCatalog";
import { ResumeContent, UploadedResumeClient } from "@/types/ResumeData";
import styles from "./ResumeViewer.module.css";
import ResumeExporter, { type ResumeExporterRef } from "./ResumeExporter";
import ResumeComponent from "./ResumeComponent";
import UploadedResumeComponent from "./UploadedResume";
import { usePanZoom } from "@/hooks/usePanZoom";

interface ResumeViewerProps {
  resumeContent: ResumeContent;
  templateId: TemplateId;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  initialZoom?: number;
}

export default function ResumeViewer({ resumeContent, templateId, isOpen, onClose, title, initialZoom}: ResumeViewerProps) {
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
  resume: UploadedResumeClient;
  isOpen: boolean;
  onClose: () => void;
  initialZoom?: number;
}

export function UploadedResumeViewer({ resume, isOpen, onClose, initialZoom}: UploadedResumeViewerProps) {

  if (!isOpen || typeof document === "undefined") return null;

  const content = (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <ResumeViewercard title={resume.title || "Resume Preview"} initialZoom={initialZoom} isOpen={isOpen} onClose={onClose}>
         <UploadedResumeComponent resume={resume} preview={false} />
      </ResumeViewercard>
    </div>
  );

  return createPortal(content, document.body);
}


interface ResumeViewercardProps {
  children: React.ReactNode;
  title: string;
  initialZoom?: number;
  handleDownload?: () => void;
  isOpen: boolean;
  isExporting?: boolean;
  onClose: () => void;
}

const ResumeViewercard = ({children, title, initialZoom, handleDownload, isExporting, onClose, isOpen }: ResumeViewercardProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { zoomIn, zoomOut, fit, zoomPercent, minZoomPercent, maxZoomPercent } = usePanZoom(
    viewportRef,
    contentRef,
    { isOpen, initialZoom, onClose }
  );

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  const atMin = zoomPercent <= minZoomPercent;
  const atMax = zoomPercent >= maxZoomPercent;

  return (
    <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>{title || "Resume Preview"}</span>
          <div className={styles.headerActions}>
            <div className={styles.zoomGroup}>
              <button className={styles.zoomBtn} onClick={zoomOut} disabled={atMin} aria-label="Zoom out">
                <ZoomOut size={14} />
              </button>
              <span className={styles.zoomLabel}>{zoomPercent}%</span>
              <button className={styles.zoomBtn} onClick={zoomIn} disabled={atMax} aria-label="Zoom in">
                <ZoomIn size={14} />
              </button>
            </div>
            <button className={styles.zoomBtn} onClick={fit} aria-label="Fit">
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
        <div className={styles.scrollArea} ref={viewportRef}>
          <div className={styles.zoomWrapper} ref={contentRef}>
            {children}
          </div>
        </div>
      </div>
  )
}