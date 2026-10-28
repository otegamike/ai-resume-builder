import { notFound } from "next/navigation";
import OldBrowserUploadHarness from "./OldBrowserUploadHarness";
import styles from "./OldBrowserUpload.module.css";

export const dynamic = "force-dynamic";

export default function OldBrowserUploadPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Old-browser upload check (dev only)</h1>
      <p className={styles.note}>
        Select a PDF to run the same required-feature check the resume upload flow uses.
      </p>
      <OldBrowserUploadHarness />
    </main>
  );
}
