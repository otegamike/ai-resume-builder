"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeIframe from "@/components/resume/ResumeIframe";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import styles from "./page.module.css";
import { useTemplateStore } from "@/store/useTemplateStore";
import { useResumeStore } from "@/store/useResumeStore";

export default function ResumesPage() {
  const { status } = useSession();
  const resumes = useResumeStore((state) => state.resumes);
  const loading = useResumeStore((state) => state.isLoading);
  const error = useResumeStore((state) => state.error);
  const fetchResumes = useResumeStore((state) => state.fetchResumes);
  const deleteResumeFromStore = useResumeStore((state) => state.deleteResume);
  const templates = useTemplateStore((state) => state.templates);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status !== "authenticated") {
      window.location.href = "/";
      return;
    }

    fetchResumes();
  }, [status, fetchResumes]);

  const deleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    try {
      await deleteResumeFromStore(id);
    } catch {
      alert("Failed to delete resume");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Loader2 className={styles.loadingIcon} />
          <p className={styles.loadingText}>Loading your resumes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <p className={styles.errorText}>{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Resumes</h1>
          <p className={styles.subtitle}>Manage and edit your created resumes.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <Link href="/editor/new">
          <div className={styles.createCard}>
            <div className={styles.createCardIcon}>
              <Plus className={styles.createCardIconSvg} />
            </div>
            <span className={styles.createCardText}>Start from scratch</span>
          </div>
        </Link>

        {resumes.map((resume) => {
          const templateId = normalizeTemplateId(resume.template);
          const templateDef = templates.find(t => t.id === templateId) || templates[0];
          const renderedTemplate = templateDef?.html && resume.content 
            ? buildTemplateSrcDoc(templateDef.html, resume.content) 
            : '';

          return (
            <div key={resume._id} className={styles.resumeCard}>
              <div className={styles.previewArea}>
                {renderedTemplate ? (
                  <ResumeIframe
                    renderedTemplate={renderedTemplate}
                    type="preview"
                  />
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <div className={`${styles.previewLine} ${styles.previewLineHalf}`} style={{ backgroundColor: 'var(--gray-200)', height: '0.5rem' }}></div>
                    <div className={`${styles.previewLine} ${styles.previewLineFull}`} style={{ backgroundColor: 'var(--gray-200)', height: '0.25rem' }}></div>
                    <div className={`${styles.previewLine} ${styles.previewLineFull}`} style={{ backgroundColor: 'var(--gray-200)', height: '0.25rem' }}></div>
                    <div className={`${styles.previewLine} ${styles.previewLineThreeQuarters}`} style={{ backgroundColor: 'var(--gray-200)', height: '0.25rem' }}></div>
                  </div>
                )}
              </div>
              
              <div className={styles.cardFooter}>
              <div>
                <h3 className={styles.resumeTitle}>{resume.title}</h3>
                <div className={styles.resumeMeta}>
                  {new Date(resume.updatedAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className={styles.actions}>
                <Link href={`/editor/${resume._id}`}>
                  <Button variant="ghost" size="sm" className={styles.actionButton}>
                    <Edit className={styles.actionButtonSvg} />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => deleteResume(resume._id)}
                >
                  <Trash2 className={styles.actionButtonSvg} />
                </Button>
              </div>
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
