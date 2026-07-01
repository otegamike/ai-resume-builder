"use client";

import {
  WandSparkles,
  Sparkles,
  PenLine,
  CheckCircle2,
  FileText,
  Briefcase,
  CircleCheck,
  AlertTriangle,
  FileDown,
  Image as ImageIcon,
} from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import styles from "./FeaturesSection.module.css";

/* ------------------------------------------------------------------ */
/*  Per-feature illustration components (CSS-driven, purely cosmetic)  */
/* ------------------------------------------------------------------ */

function ATSVisual() {
  return (
    <div className={styles.atsVisual}>
      <div className={styles.scoreRing}>
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--ai-accent-400)" />
              <stop offset="100%" stopColor="var(--primary-400)" />
            </linearGradient>
          </defs>
          <circle className={styles.scoreBgCircle} cx="50" cy="50" r="45" />
          <circle className={styles.scoreCircle} cx="50" cy="50" r="45" />
        </svg>
        <span className={styles.scoreLabel}>
          92<span className={styles.scoreLabelUnit}>/100</span>
        </span>
      </div>
      <div className={styles.scoreChecklist}>
        <span className={styles.scoreCheckItem}>
          <CircleCheck className={styles.checkIcon} />
          Keywords matched
        </span>
        <span className={styles.scoreCheckItem}>
          <CircleCheck className={styles.checkIcon} />
          Clean formatting
        </span>
        <span className={styles.scoreCheckItem}>
          <AlertTriangle className={`${styles.checkIcon} ${styles.checkIconWarn}`} />
          Missing skills section
        </span>
      </div>
    </div>
  );
}

function TypingVisual() {
  return (
    <div className={styles.typingVisual}>
      <div className={styles.typingLine} />
      <div className={styles.typingLine} />
      <div className={styles.typingLine} />
      <div className={styles.typingCursor} />
    </div>
  );
}

function CoverLetterVisual() {
  return (
    <div className={styles.stackVisual}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.stackPage}>
          <div className={styles.stackPageLine} />
          <div className={styles.stackPageLine} />
          <div className={styles.stackPageLine} />
        </div>
      ))}
    </div>
  );
}

function LivePreviewVisual() {
  return (
    <div className={styles.previewVisual}>
      <div className={`${styles.previewPane} ${styles.previewPaneCode}`}>
        <div className={styles.previewCodeLine} />
        <div className={styles.previewCodeLine} />
        <div className={styles.previewCodeLine} />
        <div className={styles.previewCodeLine} />
      </div>
      <span className={styles.previewArrow}>→</span>
      <div className={`${styles.previewPane} ${styles.previewPaneOutput}`}>
        <div className={styles.previewOutputLine} />
        <div className={styles.previewOutputLine} />
        <div className={styles.previewOutputLine} />
        <div className={styles.previewOutputLine} />
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className={styles.exportVisual}>
      <div className={styles.exportDoc}>
        <FileDown className={styles.exportDocIcon} />
        <span className={styles.exportDocLabel}>PDF</span>
      </div>
      <div className={styles.exportDoc}>
        <ImageIcon className={styles.exportDocIcon} />
        <span className={styles.exportDocLabel}>PNG</span>
      </div>
    </div>
  );
}

function KanbanVisual() {
  return (
    <div className={styles.kanbanVisual}>
      <div className={styles.kanbanLane}>
        <span className={styles.kanbanLaneLabel}>Saved</span>
        <div className={styles.kanbanCard} />
        <div className={styles.kanbanCard} />
      </div>
      <div className={styles.kanbanLane}>
        <span className={styles.kanbanLaneLabel}>Applied</span>
        <div className={`${styles.kanbanCard} ${styles.kanbanCardAi}`} />
        <div className={styles.kanbanCard} />
        <div className={styles.kanbanCard} />
      </div>
      <div className={styles.kanbanLane}>
        <span className={styles.kanbanLaneLabel}>Interview</span>
        <div className={`${styles.kanbanCard} ${styles.kanbanCardActive}`} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature data                                                       */
/* ------------------------------------------------------------------ */

interface Feature {
  icon: typeof WandSparkles;
  title: string;
  description: string;
  accent: "ai" | "primary";
  span: "hero" | "medium" | "third";
  visual: () => React.JSX.Element;
}

const features: Feature[] = [
  {
    icon: WandSparkles,
    title: "ATS Score & Optimization",
    description:
      "Upload your resume and get a detailed ATS score, flagged issues, and AI-powered fixes to beat applicant tracking systems.",
    accent: "ai",
    span: "hero",
    visual: ATSVisual,
  },
  {
    icon: Sparkles,
    title: "AI Content Writer",
    description:
      "Stuck staring at a blank page? Let our AI suggest bullet points, rewrite summaries, and improve your phrasing.",
    accent: "ai",
    span: "medium",
    visual: TypingVisual,
  },
  {
    icon: PenLine,
    title: "AI Cover Letters",
    description:
      "Generate tailored cover letters in seconds — just pick a resume and paste the job description.",
    accent: "ai",
    span: "third",
    visual: CoverLetterVisual,
  },
  {
    icon: CheckCircle2,
    title: "Live Preview",
    description:
      "See changes instantly as you type. Real-time rendering ensures your resume looks perfect before you export.",
    accent: "primary",
    span: "third",
    visual: LivePreviewVisual,
  },
  {
    icon: FileText,
    title: "Export Options",
    description:
      "Download your resume as a high-quality PDF or PNG image, ready to be sent directly to recruiters.",
    accent: "primary",
    span: "third",
    visual: ExportVisual,
  },
  {
    icon: Briefcase,
    title: "Job Tracker",
    description:
      "Track every application from saved to offered. Never lose sight of where you stand with any opportunity.",
    accent: "primary",
    span: "third",
    visual: KanbanVisual,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const spanClass: Record<Feature["span"], string> = {
  hero: styles.spanHero,
  medium: styles.spanMedium,
  third: styles.spanThird,
};

export default function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.05 });

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.eyebrow}>Everything you need</span>
          <h2 className={styles.title}>Unlock your career potential</h2>
          <p className={styles.subtitle}>
            Everything you need to create a compelling resume that lands
            interviews — powered by AI, designed for humans.
          </p>
        </div>

        {/* Bento Grid */}
        <div ref={ref} className={styles.bento}>
          {features.map((feature) => {
            const Visual = feature.visual;
            return (
              <div
                key={feature.title}
                className={[
                  styles.card,
                  feature.accent === "ai" ? styles.cardAi : styles.cardPrimary,
                  spanClass[feature.span],
                  isVisible ? styles.visible : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* AI badge */}
                {feature.accent === "ai" && (
                  <span className={styles.badge}>AI Powered</span>
                )}

                {/* Text content */}
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{feature.title}</h3>
                  <p className={styles.cardDescription}>
                    {feature.description}
                  </p>
                </div>

                {/* Illustration */}
                <div className={styles.visual}>
                  <Visual />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
