"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer";
import { TEMPLATE_PAGE, type TemplateDefinition } from "@/lib/templateCatalog";
import styles from "./page.module.css";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const previewData = useMemo(() => getTemplatePreviewData(), []);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch("/api/templates");
        if (!response.ok) throw new Error("Failed to load templates");
        const data: TemplateDefinition[] = await response.json();
        setTemplates(data);
      } catch {
        setError("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  if (loading) {
    return <div className={styles.state}>Loading templates...</div>;
  }

  if (error) {
    return <div className={styles.state}>{error}</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Template Gallery</h1>
          <p className={styles.subtitle}>Browse the available resume layouts with live sample previews.</p>
        </div>
        <Link href="/">
          <Button variant="outline" style={{textWrap: "nowrap"}}>
            <ArrowLeft className={styles.icon} />
            Back to Homepage
          </Button>
        </Link>
      </div>

      <section className={styles.grid}>
        {templates.map((template) => (
          <article key={template.id} className={styles.card}>
            <div className={styles.previewShell}>
              <iframe
                className={styles.previewFrame}
                title={`${template.name} preview`}
                srcDoc={buildTemplateSrcDoc(template.html, previewData)}
                sandbox="allow-scripts"
                loading="lazy"
              />
            </div>
            <div className={styles.cardBody}>
              <h2 className={styles.cardTitle}>{template.name}</h2>
              <p className={styles.cardText}>{template.description}</p>
              <div className={styles.cardFooter}>
                <p className={styles.cardMeta}>
                  {template.page.widthPx} x {template.page.heightPx} px
                </p>
                <Link href={`/editor/new?template=${template.id}`}>
                  <Button variant="primary" size="sm" >
                    Use Template
                    <ArrowUpRight color="var(--neutral-100)" className={styles.icon} />
                  </Button>
                </Link>
              </div>
            </div>
            
          </article>
        ))}
      </section>

      <div className={styles.pageHint}>
        Previews are displayed with a fixed {TEMPLATE_PAGE.widthPx}:{TEMPLATE_PAGE.heightPx} aspect ratio.
      </div>
    </main>
  );
}

