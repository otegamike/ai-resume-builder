"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import styles from "./TrustBar.module.css";

interface Stat {
  target: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  { target: 10000, suffix: "+", label: "Resumes Built" },
  { target: 94, suffix: "%", label: "ATS Pass Rate" },
  { target: 3, suffix: "x", label: "Faster Applications" },
];

function useCountUp(target: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, start]);

  return count;
}

function StatItem({ stat }: { stat: Stat }) {
  const { ref, isVisible } = useScrollReveal();
  const count = useCountUp(stat.target, 2000, isVisible);

  return (
    <div ref={ref} className={styles.statItem}>
      <span className={styles.statNumber}>
        {count.toLocaleString()}{stat.suffix}
      </span>
      <span className={styles.statLabel}>{stat.label}</span>
    </div>
  );
}

export default function TrustBar() {
  return (
    <div className={styles.strip}>
      <div className={styles.inner}>
        {stats.map((stat) => (
          <StatItem key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}
