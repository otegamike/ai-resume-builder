import styles from "./loading.module.css";

export default function LoginLoading() {
  return (
    <div className={styles.container}>
      <aside className={styles.brandPanel}>
        <div className={styles.brandIllustration}>
          <div className={styles.illustration} />
          <div className={styles.featureList}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.featureItem}>
                <div className={styles.featureDot} />
                <div className={styles.featureText} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.brandTagline} />
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.headingArea}>
            <h1 className={styles.title}>
              Sign in to your account
            </h1>
            <p className={styles.subtitle}>Start building AI-powered resumes in minutes.</p>
          </div>

          <div className={`${styles.pulse} ${styles.oauthBtn}`} />

          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <div className={`${styles.pulse} ${styles.dividerLabel}`} />
            <div className={styles.dividerLine} />
          </div>

          <div className={`${styles.pulse} ${styles.inputField}`} />
          <div className={`${styles.pulse} ${styles.inputField}`} />

          <div className={`${styles.pulse} ${styles.submitBtn}`} />

          <div className={`${styles.pulse} ${styles.toggleRow}`} />
        </div>
      </main>
    </div>
  );
}
