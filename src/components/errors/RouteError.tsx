"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, FileQuestion, Home, RefreshCw } from "lucide-react";
import { handleClientError } from "@/lib/errors/client";
import { toUserMessage } from "@/lib/errors/userMessage";
import styles from "./RouteError.module.css";

interface RouteErrorProps {
  error?: Error & { digest?: string };
  retry?: () => void;
  flow?: string;
  title?: string;
  message?: string;
  kind?: "error" | "not-found";
  fullPage?: boolean;
  capture?: boolean;
}

export default function RouteError({
  error,
  retry,
  flow = "unknown",
  title,
  message,
  kind = "error",
  fullPage = false,
  capture = true,
}: RouteErrorProps) {
  useEffect(() => {
    if (!error || !capture) return;
    handleClientError(error, { flow, stage: "render", notify: false });
  }, [capture, error, flow]);

  const friendly = toUserMessage(error);
  const Icon = kind === "not-found" ? FileQuestion : AlertTriangle;
  const homeLink = (
    <button
      type="button"
      className={styles.secondaryBtn}
      onClick={() => window.location.assign("/")}
    >
      <Home size={16} />
      Go home
    </button>
  );

  return (
    <div className={`${styles.page} ${fullPage ? styles.fullPage : ""}`}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Icon size={26} />
        </div>
        <h1 className={styles.title}>{title ?? friendly.title}</h1>
        <p className={styles.message}>{message ?? friendly.message}</p>
        <div className={styles.actions}>
          {retry && (
            <button className={styles.primaryBtn} onClick={retry}>
              <RefreshCw size={16} />
              Try again
            </button>
          )}
          {fullPage ? homeLink : <Link className={styles.secondaryBtn} href="/"><Home size={16} />Go home</Link>}
        </div>
      </div>
    </div>
  );
}
