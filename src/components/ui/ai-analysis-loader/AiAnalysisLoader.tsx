"use client";

import { useEffect, useState, useMemo } from "react";
import bgStyles from "@/app/auth/login/animated-bg.module.css";
import styles from "./AiAnalysisLoader.module.css";
import AnimatedCirclesBackground from "../animated-circles-background/AnimatedCirclesBackground";

const ANALYSIS_MESSAGES = [
  "Comparing experience to job description...",
  "Determining job fit...",
  "Scanning for missing keywords...",
  "Mapping skills to requirements...",
  "Weighing transferable strengths...",
  "Identifying critical gaps...",
  "Evaluating achievement alignment...",
  "Checking ATS keyword coverage...",
  "Assessing seniority and domain match...",
  "Cross-referencing responsibilities...",
  "Detecting standout strengths...",
  "Quantifying compatibility score...",
  "Spotlighting improvement areas...",
  "Calibrating match assessment...",
  "Reading between the lines...",
  "Matching accomplishments to impact...",
  "Analyzing role expectations...",
  "Highlighting key differentiators...",
  "Reviewing career trajectory fit...",
  "Finalizing fit assessment...",
  "Measuring language and tone alignment...",
  "Surfacing hidden strengths...",
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

interface Props {
  messages?: string[];
  intervalMs?: number;
}

export default function AiAnalysisLoader({ messages, intervalMs = 2200 }: Props) {
  const pool = useMemo(() => shuffle(messages ?? ANALYSIS_MESSAGES), [messages]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % pool.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [pool.length, intervalMs]);

  return (
    <div className={styles.wrapper}>
      <AnimatedCirclesBackground density='high' motion={true} className={styles.bg}></AnimatedCirclesBackground>
      <div className={`${styles.container}`} role="status" aria-live="polite" aria-busy="true">
        <div>
          <div className={styles.textBlock}>
            <p className={styles.title}>AI is analyzing your match</p>
            <p key={index} className={styles.message}>
              {pool[index]}
            </p>
            <div className={styles.dots} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
