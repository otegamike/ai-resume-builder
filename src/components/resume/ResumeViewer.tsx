"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Download, Loader2, FileText, LayoutTemplate } from "lucide-react";
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
      <ResumeViewercard title={title || resumeContent?.personalInfo.name || "Resume Preview"} initialZoom={initialZoom} handleDownload={handleDownload} isOpen={isOpen} isExporting={isExporting} onClose={onClose} simplifiedContent={resumeContent}>
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
      <ResumeViewercard title={resume.title || "Resume Preview"} initialZoom={initialZoom} isOpen={isOpen} onClose={onClose} simplifiedContent={resume.parsedResume ?? null}>
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
  simplifiedContent?: ResumeContent | null;
}

const ResumeViewercard = ({children, title, initialZoom, handleDownload, isExporting, onClose, isOpen, simplifiedContent }: ResumeViewercardProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const simplifiedRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"formatted" | "simplified">("formatted");
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = `${String(isOpen)}|${title}`;
  if (isOpen && prevOpenKey !== openKey) {
    setPrevOpenKey(openKey);
    if (view !== "formatted") setView("formatted");
  }

  const { zoomIn, zoomOut, fit, zoomPercent, minZoomPercent, maxZoomPercent } = usePanZoom(
    viewportRef,
    contentRef,
    { isOpen, initialZoom, onClose, suspended: view === "simplified" }
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
  const canToggleSimplified = Boolean(simplifiedContent);
  const showSimplified = view === "simplified" && canToggleSimplified;

  const handleToggleView = () => {
    if (showSimplified) {
      setView("formatted");
      // The pan-zoom nodes remount fresh with no transform, so re-run fit
      // once layout is ready instead of showing an unscaled page.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewportRef.current?.scrollTo({ top: 0 });
          fit();
        });
      });
    } else {
      setView("simplified");
      requestAnimationFrame(() => {
        simplifiedRef.current?.scrollTo({ top: 0 });
      });
    }
  };

  return (
    <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>{title || "Resume Preview"}</span>
          <div className={styles.headerActions}>
            {!showSimplified && (
              <>
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
              </>
            )}

            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>
        {showSimplified ? (
          <div className={styles.simplifiedScroll} ref={simplifiedRef}>
            <SimplifiedResume content={simplifiedContent as ResumeContent} />
          </div>
        ) : (
          <div className={styles.scrollArea} ref={viewportRef}>
            <div className={styles.zoomWrapper} ref={contentRef}>
              {children}
            </div>
          </div>
        )}
        <div className={styles.footer}>
          {canToggleSimplified ? (
            <button
              className={`${styles.toggleBtn} ${showSimplified ? styles.toggleBtnActive : ""}`}
              onClick={handleToggleView}
              aria-pressed={showSimplified}
            >
              {showSimplified ? <LayoutTemplate size={14} /> : <FileText size={14} />}
              {showSimplified ? "View formatted" : "View simplified"}
            </button>
          ) : (
            <span />
          )}
          <span className={styles.footerSpacer} />
          {handleDownload && (
            <button className={styles.downloadBtn} onClick={handleDownload} disabled={isExporting}>
              {isExporting ? <Loader2 size={14} className={styles.spinner ?? ""} /> : <Download size={14} />} Download
            </button>
          )}
        </div>
      </div>
  )
}

function SimplifiedResume({ content }: { content: ResumeContent }) {
  if (!content) {
    return <p className={styles.simplifiedEmpty}>No readable text available for this resume.</p>;
  }

  const personalInfo = content.personalInfo ?? {};
  const contactParts = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.website].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  const skillCategories = content.skillCategories ?? [];
  const flatSkills = content.skills ?? [];
  const hasSkillCategories = skillCategories.length > 0;
  const hasFlatSkills = flatSkills.length > 0;
  const education = content.education ?? [];
  const experience = content.experience ?? [];
  const projects = content.projects ?? [];
  const hasBody =
    Boolean(content.summary?.trim()) ||
    hasSkillCategories ||
    hasFlatSkills ||
    education.length > 0 ||
    experience.length > 0 ||
    projects.length > 0 ||
    Boolean(personalInfo.name?.trim());

  if (!hasBody) {
    return <p className={styles.simplifiedEmpty}>No readable text available for this resume.</p>;
  }

  return (
    <div className={styles.simplified}>
      <div className={styles.simplifiedName}>{personalInfo.name || "Untitled Resume"}</div>
      {personalInfo.jobTitle && <div className={styles.simplifiedJobTitle}>{personalInfo.jobTitle}</div>}
      {contactParts.length > 0 && <div className={styles.simplifiedContact}>{contactParts.join("  |  ")}</div>}

      {hasSkillCategories && (
        <>
          <hr className={styles.simplifiedDivider} />
          <div className={styles.simplifiedSectionLabel}>Skills</div>
          {skillCategories.map((group) => (
            <div key={group.id || group.category} className={styles.simplifiedSkillGroup}>
              <div className={styles.simplifiedSkillCategory}>{group.category}</div>
              <div className={styles.simplifiedSkillList}>
                {(group.skills ?? []).map((skill) => (
                  <span key={skill} className={styles.simplifiedSkillItem}>{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {!hasSkillCategories && hasFlatSkills && (
        <>
          <hr className={styles.simplifiedDivider} />
          <div className={styles.simplifiedSectionLabel}>Skills</div>
          <div className={styles.simplifiedSkillList}>
            {flatSkills.map((skill) => (
              <span key={skill} className={styles.simplifiedSkillItem}>{skill}</span>
            ))}
          </div>
        </>
      )}

      {education.length > 0 && (
        <>
          <hr className={styles.simplifiedDivider} />
          <div className={styles.simplifiedSectionLabel}>Education</div>
          {education.map((edu) => (
            <div key={edu.id || `${edu.school}-${edu.degree}`} className={styles.simplifiedEntry}>
              <div className={styles.simplifiedEduDegree}>{edu.degree}</div>
              <div className={styles.simplifiedEduDetail}>
                {[edu.school, [edu.startDate, edu.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" — ")}
              </div>
            </div>
          ))}
        </>
      )}

      {experience.length > 0 && (
        <>
          <hr className={styles.simplifiedDivider} />
          <div className={styles.simplifiedSectionLabel}>Experience</div>
          {experience.map((exp) => (
            <div key={exp.id || `${exp.company}-${exp.role}`} className={styles.simplifiedEntry}>
              <div className={styles.simplifiedExpHeader}>
                <span className={styles.simplifiedExpRole}>{exp.role}</span>
                <span className={styles.simplifiedExpDates}>
                  {[exp.startDate, exp.endDate].filter(Boolean).join(" – ")}
                </span>
              </div>
              {exp.company && <div className={styles.simplifiedExpCompany}>{exp.company}</div>}
              {(exp.description ?? []).map((line, index) => (
                <p key={index} className={styles.simplifiedBullet}>{line}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {projects.length > 0 && (
        <>
          <hr className={styles.simplifiedDivider} />
          <div className={styles.simplifiedSectionLabel}>Projects</div>
          {projects.map((project) => (
            <div key={project.id || project.name} className={styles.simplifiedEntry}>
              <div className={styles.simplifiedProjectName}>{project.name}</div>
              {(project.description ?? []).map((line, index) => (
                <p key={index} className={styles.simplifiedBullet}>{line}</p>
              ))}
            </div>
          ))}
        </>
      )}

      {content.summary?.trim() && (
        <>
          <hr className={styles.simplifiedDivider} />
          <div className={styles.simplifiedSectionLabel}>Summary</div>
          <p className={styles.simplifiedSummary}>{content.summary}</p>
        </>
      )}
    </div>
  );
}