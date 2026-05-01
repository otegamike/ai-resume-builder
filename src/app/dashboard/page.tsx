"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { type TemplateDefinition } from "@/lib/templateCatalog";
import styles from "./page.module.css";

interface ResumeContent {
  personalInfo: {
    name: string;
    jobTitle: string;
    email: string;
    phone: string;
    location: string;
    website: string;
  };
  summary: string;
  experience: any[];
  education: any[];
  skills: string[];
}

interface Resume {
  _id: string;
  title: string;
  updatedAt: string;
  template: string;
  content: ResumeContent;
}

export default function DashboardPage() {
  const { isLoaded, userId } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [templateDefinitions, setTemplateDefinitions] = useState<TemplateDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!userId) {
      window.location.href = "/";
      return;
    }

    const fetchResumes = async () => {
      try {
        const response = await fetch('/api/resumes');
        if (response.ok) {
          const data: Resume[] = await response.json();
          setResumes(data);
        } else {
          setError("Failed to load resumes");
        }
      } catch {
        setError("Failed to load resumes");
      }
    };

    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        if (response.ok) {
          const data = await response.json();
          setTemplateDefinitions(data);
        }
      } catch (err) {
        console.error("Failed to load templates", err);
      }
    };

    Promise.all([fetchResumes(), fetchTemplates()]).finally(() => {
      setLoading(false);
    });
  }, [isLoaded, userId]);

  const deleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const response = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setResumes(resumes.filter((r) => r._id !== id));
      } else {
        alert("Failed to delete resume");
      }
    } catch {
      alert("Failed to delete resume");
    }
  };

  if (!isLoaded || loading) {
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
          const templateDef = templateDefinitions.find(t => t.id === templateId) || templateDefinitions[0];
          const renderedTemplate = templateDef?.html && resume.content 
            ? buildTemplateSrcDoc(templateDef.html, resume.content) 
            : '';

          return (
            <div key={resume._id} className={styles.resumeCard}>
              <div className={styles.previewArea}>
                {renderedTemplate ? (
                  <div className={styles.iframeWrapper}>
                    <iframe
                      srcDoc={renderedTemplate}
                      className={styles.dashboardPreviewIframe}
                      sandbox="allow-same-origin"
                      tabIndex={-1}
                    />
                  </div>
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