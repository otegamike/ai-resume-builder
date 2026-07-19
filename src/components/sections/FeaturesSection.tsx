"use client";

import React, { useState, useEffect } from "react";
import {
  WandSparkles,
  FileCheck,
  PenLine,
  CheckCircle2,
  FileText,
  Briefcase,
  CircleCheck,
  AlertTriangle,
  FileDown,
  Image as ImageIcon,
} from "lucide-react";
import { useCardReveal } from "@/hooks/useCardReveal";
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

const TAILOR_SETS = [
  {
    old: [
      "Responsible for developing new features",
      "Worked with team on various projects",
      "Managed social media accounts",
    ],
    new: [
      "Led React dashboard development, boosting engagement 35%",
      "Collaborated cross-functionally to ship 12 features on time",
      "Grew LinkedIn following 200% through targeted content strategy",
    ],
  },
  {
    old: [
      "Assisted in creating marketing materials",
      "Participated in weekly team meetings",
      "Helped with data entry tasks",
    ],
    new: [
      "Designed multi-channel campaigns driving 50K impressions",
      "Facilitated cross-team strategy sessions, reducing sprint cycles 20%",
      "Built automated data pipelines reducing manual entry by 90%",
    ],
  },
];

function TailorVisual({ isActive = false }: { isActive?: boolean }) {
  const [step, setStep] = useState(-1);
  const [setIdx, setSetIdx] = useState(0);
  const [typed, setTyped] = useState(["", "", ""]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const set = TAILOR_SETS[setIdx];

    if (step === -1) {
      const t = setTimeout(() => {
        setSetIdx((prev) => (prev + 1) % TAILOR_SETS.length);
        setTyped(["", "", ""]);
        setStep(0);
      }, 200);
      return () => clearTimeout(t);
    }

    if (step === 0) {
      queueMicrotask(() => setVisible(true));
      const t = setTimeout(() => setStep(1), 500);
      return () => clearTimeout(t);
    }

    if (step === 1) {
      const t = setTimeout(() => setStep(2), 1500);
      return () => clearTimeout(t);
    }

    if (step === 2 || step === 4 || step === 6) {
      const t = setTimeout(() => setStep(step + 1), 600);
      return () => clearTimeout(t);
    }

    if (step === 3 || step === 5 || step === 7) {
      const bulletIdx = (step - 3) / 2;
      if (typed[bulletIdx].length < set.new[bulletIdx].length) {
        const target = set.new[bulletIdx];
        const t = setTimeout(() => {
          setTyped((prev) => {
            const next = [...prev];
            next[bulletIdx] = target.slice(0, next[bulletIdx].length + 1);
            return next;
          });
        }, 30);
        return () => clearTimeout(t);
      }
      queueMicrotask(() => setStep(step + 1));
      return;
    }

    if (step === 8) {
      queueMicrotask(() => setVisible(false));
      const t = setTimeout(() => setStep(-1), 500);
      return () => clearTimeout(t);
    }
  }, [step, typed, setIdx, isActive]);

  return (
    <div className={styles.tailorVisual}>
      <div className={`${styles.tailorDoc} ${visible ? styles.tailorDocVisible : ""}`}>
        <div className={styles.tailorLabel}>Experience</div>
        {TAILOR_SETS[setIdx].old.map((oldBullet, i) => {
          const bulletStep = 2 + i * 2;
          const showStrike = step >= bulletStep;
          const showNew = step >= bulletStep + 1;
          const isTyping = step === bulletStep + 1;

          return (
            <div key={i}>
              <div className={styles.tailorLine}>
                <span className={`${styles.tailorMarker} ${!showStrike ? styles.tailorMarkerBullet : ""}`}>
                  {showStrike ? "✕" : "•"}
                </span>
                <span
                  className={`${styles.tailorOld} ${showStrike ? styles.tailorStruck : ""}`}
                >
                  {oldBullet}
                </span>
              </div>
              {showNew && (
                <div className={styles.tailorLine}>
                  <span className={`${styles.tailorMarker} ${styles.tailorMarkerCheck}`}>✓</span>
                  <span className={styles.tailorNew}>
                    {typed[i]}
                    {isTyping && <span className={styles.tailorCursor} />}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const COVER_LETTER_TEXTS = [
  "Dear Hiring Team,\n\nI am excited to apply for the Software Engineer position. With 5+ years building scalable web applications, I am confident I can deliver immediate value to your engineering team.",
  "Dear Hiring Manager,\n\nYour mission to transform the industry deeply resonates with me. My background in product design and user research makes me an ideal fit for this role.",
  "To the Hiring Committee,\n\nI have followed your company's innovative trajectory with admiration. My experience leading cross-functional teams aligns perfectly with the challenges of this position.",
  "Dear [Company] Team,\n\nI am writing to express strong interest in the Data Scientist role. My expertise in machine learning and statistical modeling can help drive data-informed decisions.",
];

function CoverLetterVisual({ isActive = false }: { isActive?: boolean }) {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "paused">("typing");

  const currentText = COVER_LETTER_TEXTS[textIndex];

  useEffect(() => {
    if (!isActive) return;

    if (phase === "paused") {
      const timer = setTimeout(() => {
        setTextIndex((prev) => (prev + 1) % COVER_LETTER_TEXTS.length);
        setDisplayText("");
        setPhase("typing");
      }, 2500);
      return () => clearTimeout(timer);
    }

    if (displayText.length < currentText.length) {
      const timer = setTimeout(() => {
        setDisplayText(currentText.slice(0, displayText.length + 1));
      }, 35);
      return () => clearTimeout(timer);
    }

    queueMicrotask(() => setPhase("paused"));
  }, [displayText, phase, textIndex, currentText, isActive]);

  return (
    <div className={styles.stackVisual}>
      <div className={styles.typewriterPaper}>
        <div className={styles.typewriterText}>
          {displayText}
          <span className={styles.cursor} />
        </div>
      </div>
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
  visual: React.ComponentType<{ isActive?: boolean }>;
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
    icon: FileCheck,
    title: "Tailor Resume to Job Description",
    description:
      "Paste a job description and instantly rewrite your resume to match — highlighting relevant skills, rephrasing bullets, and optimizing keywords.",
    accent: "ai",
    span: "medium",
    visual: TailorVisual,
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
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const spanClass: Record<Feature["span"], string> = {
  hero: styles.spanHero,
  medium: styles.spanMedium,
  third: styles.spanThird,
};

function FeatureCard({ feature, index, sequenceIndex }: { feature: Feature; index: number; sequenceIndex: number }) {
  const { ref, isInView } = useCardReveal({ threshold: 0.15 });
  const Visual = feature.visual;
  const isVisualActive = isInView && index <= sequenceIndex;

  return (
    <div
      ref={ref}
      className={[
        styles.card,
        feature.accent === "ai" ? styles.cardAi : styles.cardPrimary,
        spanClass[feature.span],
        isInView ? styles.cardInView : "",
        isVisualActive ? styles.visualActive : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {feature.accent === "ai" && (
        <span className={styles.badge}>AI Powered</span>
      )}

      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{feature.title}</h3>
        <p className={styles.cardDescription}>
          {feature.description}
        </p>
      </div>

      <div className={styles.visual}>
        <Visual isActive={isVisualActive} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FeaturesSection() {
  const [sequenceIndex, setSequenceIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSequenceIndex((prev) => {
        if (prev >= features.length - 1) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section id="features" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Everything you need</span>
          <h2 className={styles.title}>Unlock your career potential</h2>
          <p className={styles.subtitle}>
            Everything you need to create a compelling resume that lands
            interviews — powered by AI, designed for humans.
          </p>
        </div>

        <div className={styles.bento}>
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              sequenceIndex={sequenceIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
