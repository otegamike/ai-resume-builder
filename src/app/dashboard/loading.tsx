import styles from "./loading.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.welcomeBanner}>
        <div className={`${styles.pulse} ${styles.bannerTitle}`} />
        <div className={`${styles.pulse} ${styles.bannerSubtitle}`} />
        <div className={`${styles.pulse} ${styles.bannerCredits}`} />
      </div>

      <div className={`${styles.pulse} ${styles.createNewBtn}`} />

      <div className={styles.statsRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.pulse} ${styles.statCard}`} />
        ))}
      </div>

      <div>
        <div className={styles.sectionHeader}>
          <div className={`${styles.pulse} ${styles.sectionTitle}`} />
        </div>
        <div className={styles.resumeScroll}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.pulse} ${styles.resumeCard}`} />
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionHeader}>
          <div className={`${styles.pulse} ${styles.sectionTitle}`} />
        </div>
        <div className={styles.actionsGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.pulse} ${styles.actionCard}`} />
          ))}
        </div>
      </div>

      <div>
        <div className={styles.sectionHeader}>
          <div className={`${styles.pulse} ${styles.sectionTitle}`} />
        </div>
        <div className={styles.activityList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.pulse} ${styles.activityItem}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
