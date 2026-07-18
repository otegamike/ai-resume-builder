import Link from "next/link";
import styles from "./Footer.module.css";
import Logo from "../svgs/logo";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <Logo className={styles.brandLogo} color='var(--primary-200)' size={40}/>
            <span className={styles.brand}>AgenticApp.cv</span>
            <p className={styles.tagline}>
              Elevate your career with AI-powered resumes.
            </p>
          </div>

          <nav className={styles.linkGroup} aria-label="Product links">
            <span className={styles.linkGroupTitle}>Product</span>
            <Link href="/templates" className={styles.link}>Templates</Link>
            <Link href="/pricing" className={styles.link}>Pricing</Link>
            <Link href="/editor/new" className={styles.link}>Resume Builder</Link>
          </nav>

          <nav className={styles.linkGroup} aria-label="Company links">
            <span className={styles.linkGroupTitle}>Company</span>
            <Link href="/" className={styles.link}>Privacy Policy</Link>
            <Link href="/" className={styles.link}>Terms of Service</Link>
            <Link href="/" className={styles.link}>Contact Support</Link>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} AgenticApp.cv. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
