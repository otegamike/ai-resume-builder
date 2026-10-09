import { notFound } from "next/navigation";
import { renderEmail, templateSamples } from "@/lib/email/render";
import styles from "./EmailPreview.module.css";

export const dynamic = "force-dynamic";

export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const samples = templateSamples();
  const rendered = await Promise.all(
    samples.map(async (sample) => {
      try {
        const email = await renderEmail(sample.type, sample.payload);
        return { type: sample.type, ok: true as const, ...email };
      } catch (error) {
        return {
          type: sample.type,
          ok: false as const,
          error: error instanceof Error ? error.message : "render failed",
        };
      }
    })
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Email previews (dev only)</h1>
      <p className={styles.note}>
        Each template below is rendered through the real production path. Plain-text versions follow
        the HTML preview.
      </p>
      {rendered.map((item) =>
        item.ok ? (
          <section key={item.type} className={styles.card}>
            <h2 className={styles.templateName}>{item.type}</h2>
            <p className={styles.subject}>Subject: {item.subject}</p>
            <iframe title={`${item.type} preview`} srcDoc={item.html} className={styles.frame} />
            <pre className={styles.text}>{item.text}</pre>
          </section>
        ) : (
          <section key={item.type} className={styles.card}>
            <h2 className={styles.templateName}>{item.type}</h2>
            <p className={styles.error}>Failed to render: {item.error}</p>
          </section>
        )
      )}
    </main>
  );
}
