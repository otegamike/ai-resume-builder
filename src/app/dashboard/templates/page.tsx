"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Clock, Sparkles, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeIframe from "@/components/resume/ResumeIframe";
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer";
import type { TemplateDefinition } from "@/lib/templateCatalog";
import { getFavoriteTemplateIds, toggleFavoriteTemplate, getRecentlyUsedTemplates } from "@/utils/templateStorage";
import styles from "./page.module.css";

export default function DashboardTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateDefinition[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const previewData = useMemo(() => getTemplatePreviewData(), []);
  const recentFromStorage = useMemo(() => getRecentlyUsedTemplates(), []);

  useEffect(() => {
    setFavorites(getFavoriteTemplateIds());
    const load = async () => {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) setTemplates(await res.json());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleFav = (id: string) => {
    toggleFavoriteTemplate(id);
    setFavorites(getFavoriteTemplateIds());
  };

  const favoriteTemplates = templates.filter((t) => favorites.includes(t.id));
  const recentTemplates = recentFromStorage
    .map((r) => templates.find((t) => t.id === r.id))
    .filter((t): t is TemplateDefinition => !!t);
  const suggestTemplates = templates.filter(
    (t) => !favorites.includes(t.id) && !recentFromStorage.some((r) => r.id === t.id)
  );

  const renderCard = (template: TemplateDefinition) => {
    const isFav = favorites.includes(template.id);
    return (
      <article key={template.id} className={styles.card}>
        <div className={styles.previewWrap}>
          <ResumeIframe
            renderedTemplate={buildTemplateSrcDoc(template.html, previewData)}
            type="preview"
          />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{template.name}</h3>
            <button onClick={() => toggleFav(template.id)} className={styles.favButton} title={isFav ? "Remove from favorites" : "Add to favorites"}>
              <Heart className={isFav ? styles.favIconActive : styles.favIcon} />
            </button>
          </div>
          <Link href={`/editor/new?template=${template.id}`}>
            <Button variant="primary" size="sm" className={styles.useButton}>
              Use Template
            </Button>
          </Link>
        </div>
      </article>
    );
  };

  if (loading) {
    return <div className={styles.state}>Loading templates...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Templates</h1>
        <p className={styles.subtitle}>Pick up where you left off or discover new layouts.</p>
      </div>

      {favoriteTemplates.length > 0 && (
        <section>
          <div className={styles.sectionTitle}>
            <Heart className={styles.sectionIcon} />
            <h2>Favourite Templates</h2>
          </div>
          <div className={styles.grid}>{favoriteTemplates.map(renderCard)}</div>
        </section>
      )}

      {recentTemplates.length > 0 && (
        <section>
          <div className={styles.sectionTitle}>
            <Clock className={styles.sectionIcon} />
            <h2>Recently Used</h2>
          </div>
          <div className={styles.grid}>{recentTemplates.map(renderCard)}</div>
        </section>
      )}

      {suggestTemplates.length > 0 && (
        <section>
          <div className={styles.sectionTitle}>
            <Sparkles className={styles.sectionIcon} />
            <h2>You Might Also Like</h2>
          </div>
          <div className={styles.grid}>{suggestTemplates.slice(0, 4).map(renderCard)}</div>
        </section>
      )}

      <div className={styles.moreSection}>
        <Link href="/templates">
          <Button variant="outline" size="sm" className={styles.moreButton}>
            <LayoutTemplate className={styles.btnIcon} />
            More Templates
            <ArrowRight className={styles.btnIcon} />
          </Button>
        </Link>
      </div>
    </div>
  );
}
