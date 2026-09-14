"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Edit, Trash2, Loader2, Pin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";
import { useResumeStore } from "@/store/useResumeStore";
import { useAlertStore } from "@/store/useAlertStore";
import { useUserStore } from "@/store/useUserStore";
import { ResumeContent } from "@/types/ResumeData";
import ResumeComponent from "@/components/resume/ResumeComponent";

export default function ResumesPage() {
  const { status } = useSession();
  const resumes = useResumeStore((state) => state.resumes);
  const loading = useResumeStore((state) => state.isLoading);
  const error = useResumeStore((state) => state.error);
  const fetchResumes = useResumeStore((state) => state.fetchResumes);
  const deleteResumeFromStore = useResumeStore((state) => state.deleteResume);
  const pinnedResumeId = useUserStore((state) => state.pinnedResumeId);
  const fetchPinnedResume = useUserStore((state) => state.fetchPinnedResume);
  const setPinnedResume = useUserStore((state) => state.setPinnedResume);

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      window.location.href = "/";
      return;
    }

    fetchResumes();
    fetchPinnedResume();
  }, [status, fetchResumes, fetchPinnedResume]);

  const deleteResume = async (id: string) => {
    const confirmed = await useAlertStore.getState().showConfirmDialog("Are you sure you want to delete this resume?");
    if (!confirmed) return;
    await deleteResumeFromStore(id);
    if (pinnedResumeId === id) {
      await setPinnedResume(null);
    }
  };

  const pinResume = async (id: string) => {
    const next = pinnedResumeId === id ? null : id;
    await setPinnedResume(next);
  };

  const sortedResumes = pinnedResumeId
    ? [...resumes].sort((a, b) => {
        if (a._id === pinnedResumeId) return -1;
        if (b._id === pinnedResumeId) return 1;
        return 0;
      })
    : resumes;

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

        {sortedResumes.map((resume) => {
          return (
            <ResumeCardComponent
              key={resume._id}
              _id={resume._id}
              title={resume.title}
              template={resume.template}
              resumeContent={resume.content}
              updatedAt={resume.updatedAt}
              isPinned={resume._id === pinnedResumeId}
              deleteResume={deleteResume}
              pinResume={pinResume}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ResumeCardComponentProps {
  _id: string;
  title: string;
  template: string;
  resumeContent: ResumeContent;
  updatedAt: string;
  isPinned?: boolean;
  deleteResume: (id: string) => Promise<void>;
  pinResume: (id: string) => Promise<void>;
}

function ResumeCardComponent({resumeContent, _id, template, updatedAt, title, isPinned, deleteResume, pinResume  } : ResumeCardComponentProps) {
  return (
    <div key={_id} className={`${styles.resumeCard} ${isPinned ? styles.pinned : ""}`}>
              <ResumeComponent
                resumeContent={resumeContent}
                templateId={template}
              />
              
              <div className={styles.cardFooter}>
              <div>
                <h3 className={styles.resumeTitle}>{title}</h3>
                <div className={styles.resumeMeta}>
                  {new Date(updatedAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className={styles.actions}>
                <Link href={`/editor/${_id}`}>
                  <Button variant="ghost" size="sm" className={styles.actionButton}>
                    <Edit className={styles.actionButtonSvg} />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => deleteResume(_id)}
                >
                  <Trash2 className={styles.actionButtonSvg} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`${styles.actionButton}`}
                  onClick={() => pinResume(_id)}
                >
                  <Pin fill={isPinned?'var(--neutral-700)': 'transparent'} className={styles.actionButtonSvg} />
                </Button>
              </div>
              {isPinned && (
                <div className={styles.pinnedIndicator}> 
                  <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`${styles.actionButton}`}
                  onClick={() => pinResume(_id)}
                >
                  <Pin fill='var(--neutral-200)' className={styles.actionButtonSvg} />
                </Button>
                </div>
              )}
            </div>
          </div>
  )
}
