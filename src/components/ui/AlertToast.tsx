"use client";

import { useEffect, useRef } from "react";
import { useAlertStore, type Alert } from "@/store/useAlertStore";
import styles from "./alert-toast.module.css";

const DURATION = 5000;
const EXIT_DURATION = 300;

const icons: Record<string, React.ReactNode> = {
  success: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className={styles.icon} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
};

function ToastItem({ alert, onClose }: { alert: Alert; onClose: (id: string) => void }) {
  const exitingRef = useRef(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      exitingRef.current = true;
    }, DURATION);

    const removeTimer = setTimeout(() => {
      onClose(alert.id);
    }, DURATION + EXIT_DURATION);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [alert.id, onClose]);

  return (
    <div
      className={`${styles.toast} ${styles[alert.type]}`}
      role="alert"
    >
      {icons[alert.type]}
      <span className={styles.message}>{alert.message}</span>
      <button
        className={styles.close}
        onClick={() => onClose(alert.id)}
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

export default function AlertToast() {
  const alerts = useAlertStore((state) => state.alerts);
  const removeAlert = useAlertStore((state) => state.removeAlert);

  if (alerts.length === 0) return null;

  return (
    <div className={styles.container}>
      {alerts.map((alert) => (
        <ToastItem key={alert.id} alert={alert} onClose={removeAlert} />
      ))}
    </div>
  );
}
