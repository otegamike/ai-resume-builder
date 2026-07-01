"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import styles from "./FinalCTA.module.css";

export default function FinalCTA() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      ref={ref}
      className={`${styles.section} ${isVisible ? styles.visible : ""}`}
    >
      <div className={styles.glowLeft} />
      <div className={styles.glowRight} />

      <div className={styles.container}>
        <h2 className={styles.title}>Ready to land your dream job?</h2>
        <p className={styles.subtitle}>
          Join thousands of professionals who accelerated their careers with Agentic CV.
        </p>
        <div className={styles.actions}>
          <Link href="/auth/login" className={styles.buttonPrimary}>
            Get Started for Free
          </Link>
          <Link href="/templates" className={styles.buttonSecondary}>
            View Templates
          </Link>
        </div>
      </div>
    </section>
  );
}
