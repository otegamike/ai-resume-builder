import Link from "next/link";
import styles from "./FinalCTA.module.css";

export default function FinalCTA() {
  return (
    <section className={styles.section}>
      <div className={styles.banner}>
        <h2 className={styles.title}>Ready to land your dream job?</h2>
        <p className={styles.subtitle}>
          Join over 50,000 professionals who used AgenticApp.cv to accelerate their career growth.
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
