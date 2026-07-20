import styles from "./loading.module.css";

export default function EditorLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleBar}>
        <div className={styles.titleBarLeft}>
          <div className={styles.pulse} style={{ width: "1.25rem", height: "1.25rem", borderRadius: "0.25rem" }} />
          <div style={{ width: "1px", height: "1rem", backgroundColor: "var(--gray-300)" }} />
          <div className={styles.pulse} style={{ width: "12rem", height: "1.5rem" }} />
          <div className={styles.pulse} style={{ width: "8rem", height: "2rem", borderRadius: "var(--radius-lg)" }} />
        </div>
        <div className={styles.titleBarRight}>
          <div className={styles.pulse} style={{ width: "6rem", height: "2rem", borderRadius: "var(--radius-lg)" }} />
          <div className={styles.pulse} style={{ width: "6rem", height: "2rem", borderRadius: "var(--radius-lg)" }} />
        </div>
      </div>
      <div className={styles.mainWorkspace}>
        <div className={styles.leftPanel}>
          <div className={styles.navTabs}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`${styles.pulseLight} ${styles.navTab}`} />
            ))}
          </div>
          <div className={styles.formArea}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}>
                {i < 3 && <div className={`${styles.pulseLight} ${styles.formFieldLabel}`} />}
                <div
                  className={`${styles.pulseLight} ${styles.formField}`}
                  style={{ width: i === 0 ? "100%" : i === 1 ? "75%" : i === 2 ? "85%" : i === 3 ? "65%" : i === 4 ? "80%" : "60%" }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={`${styles.pulseLight} ${styles.preview}`} />
        </div>
      </div>
    </div>
  );
}
