import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import blogStyles from "./blog.module.css";
import styles from "./BlogCTA.module.css";

export default function BlogCTA() {
  return (
    <aside className={styles.card}>
      <Sparkles size={22} className={styles.icon} />
      <h2 className={styles.title}>Build a resume that gets you interviews</h2>
      <p className={styles.subtitle}>
        Let AI craft an ATS-optimized resume and cover letters tailored to your
        next role in minutes.
      </p>
      <Link href="/auth/login" className={styles.cta}>
        Get Started
        <ArrowUpRight size={18} />
      </Link>
      <p className={styles.note}>
        <span className={blogStyles.eyebrowLine} />
        Free ATS score included
      </p>
    </aside>
  );
}
