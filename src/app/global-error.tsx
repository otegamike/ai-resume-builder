"use client";

import "./globals.css";
import RouteError from "@/components/errors/RouteError";
import styles from "./global-error.module.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body className={styles.body}>
        <RouteError error={error} retry={unstable_retry} flow="global" fullPage />
      </body>
    </html>
  );
}
