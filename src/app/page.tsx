import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import styles from "./page.module.css";
import Hero from "@/components/hero/Hero";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.heroGradientLeft} />
      <div className={styles.heroGradientRight} />
      <main className={styles.main}>
        <Hero />

        <section id="features" className={styles.featuresSection}>
          <div className={styles.featuresContainer}>
            <div className={styles.featuresHeader}>
              <h2 className={styles.featuresTitle}>Unlock your career potential</h2>
              <p className={styles.featuresDescription}>
                Everything you need to create a compelling resume that lands interviews.
              </p>
            </div>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <Sparkles className={styles.featureIconSvg} />
                </div>
                <h3 className={styles.featureTitle}>AI Content Writer</h3>
                <p className={styles.featureDescription}>
                  Stuck staring at a blank page? Let our AI suggest bullet points, rewrite summaries, and improve your phrasing.
                </p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <CheckCircle2 className={styles.featureIconSvg} />
                </div>
                <h3 className={styles.featureTitle}>Live Preview</h3>
                <p className={styles.featureDescription}>
                  See changes instantly as you type. Real-time rendering ensures your resume looks perfect before you export.
                </p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>
                  <FileText className={styles.featureIconSvg} />
                </div>
                <h3 className={styles.featureTitle}>PDF Export</h3>
                <p className={styles.featureDescription}>
                  Download your finished resume instantly in a high-quality PDF format, ready to be sent directly to recruiters.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          &copy; {new Date().getFullYear()} Agentic CV. All rights reserved.
        </p>
      </footer>
    </div>
  );
}