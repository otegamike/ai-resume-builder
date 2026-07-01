"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import styles from "./TestimonialStats.module.css";

const placeholderQuote =
  '"Agentic CV transformed my job search. The AI-powered resume optimizer helped me land interviews at top tech companies I never thought I\'d hear back from."';

const placeholderAttribution = "— Sarah Chen, Software Engineer at Google";

const statCards = [
  { value: "2.5x", label: "More interview callbacks" },
  { value: "89%", label: "of users improve their ATS score" },
  { value: "10 min", label: "Average time to build a resume" },
];

export default function TestimonialStats() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ""}`}
    >
      <div className={styles.blobLeft} />
      <div className={styles.blobRight} />

      <div className={styles.container}>
        <blockquote className={styles.quote}>
          {placeholderQuote}
        </blockquote>
        <cite className={styles.attribution}>{placeholderAttribution}</cite>

        <div className={styles.statsGrid}>
          {statCards.map((card) => (
            <div key={card.label} className={styles.statCard}>
              <span className={styles.statValue}>{card.value}</span>
              <span className={styles.statDesc}>{card.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
