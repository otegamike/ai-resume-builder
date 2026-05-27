"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeIframe from "@/components/resume/ResumeIframe";
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer";
import { TEMPLATE_PAGE, type TemplateDefinition } from "@/lib/templateCatalog";
import { useSession } from "next-auth/react";
import { getFavoriteTemplateIds, toggleFavoriteTemplate } from "@/utils/templateStorage";
import styles from "./page.module.css";

export default function TemplatesPage() {
  const { status } = useSession();
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const previewData = useMemo(() => getTemplatePreviewData(), []);

  useEffect(() => {
    setFavorites(getFavoriteTemplateIds());
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

  const toggleFav = (id: string) => {
    toggleFavoriteTemplate(id);
    setFavorites(getFavoriteTemplateIds());
  };

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
          <Button variant="outline" style={{ textWrap: "nowrap" }}>
            <ArrowLeft className={styles.icon} />
            Back to Homepage
          </Button>
        </Link>
      </div>

      <section className={styles.grid}>
        {templates.map((template) => {
          const isFav = favorites.includes(template.id);
          return (
            <article key={template.id} className={styles.card}>
              <div className={styles.previewShell}>
                <ResumeIframe
                  renderedTemplate={buildTemplateSrcDoc(template.html, previewData)}
                  type="preview"
                />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitleRow}>
                  <h2 className={styles.cardTitle}>{template.name}</h2>
                  <button
                    onClick={() => toggleFav(template.id)}
                    className={styles.favButton}
                    title={isFav ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={isFav ? styles.favIconActive : styles.favIcon} />
                  </button>
                </div>
                <p className={styles.cardText}>{template.description}</p>
                <div className={styles.cardFooter}>
                  <p className={styles.cardMeta}>
                    {template.page.widthPx} x {template.page.heightPx} px
                  </p>
                  <Link
                    href={
                      status === "authenticated"
                        ? `/editor/new?template=${template.id}`
                        : `/auth/login?callbackUrl=${encodeURIComponent(`/editor/new?template=${template.id}`)}`
                    }
                  >
                    <Button variant="primary" size="sm">
                      Use Template
                      <ArrowUpRight color="var(--neutral-100)" className={styles.icon} />
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <div className={styles.pageHint}>
        Previews are displayed with a fixed {TEMPLATE_PAGE.widthPx}:{TEMPLATE_PAGE.heightPx} aspect ratio.
      </div>
    </main>
  );
}
