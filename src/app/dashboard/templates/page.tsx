"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight, Clock, Sparkles, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/Button";
import ResumeIframe from "@/components/resume/ResumeIframe";
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer";
import type { TemplateDefinition } from "@/lib/templateCatalog";
import { getFavoriteTemplateIds, toggleFavoriteTemplate, getRecentlyUsedTemplates } from "@/utils/templateStorage";
import { useTemplateStore } from "@/store/useTemplateStore";
import styles from "./page.module.css";

export default function DashboardTemplatesPage() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const templates = useTemplateStore((state) => state.templates);
  const storeError = useTemplateStore((state) => state.error);
  const [loaded, setLoaded] = useState(templates.length > 0);

  const freeTemplates = useMemo(() => templates.filter((t) => t.tier === "free"), [templates]);

  useEffect(() => {
    if (templates.length > 0 || storeError) setLoaded(true);
  }, [templates, storeError]);

  const loading = !loaded;

  const previewData = useMemo(() => getTemplatePreviewData(), []);
  const recentFromStorage = useMemo(() => getRecentlyUsedTemplates(), []);

  useEffect(() => {
    setFavorites(getFavoriteTemplateIds());
  }, []);

  const toggleFav = (id: string) => {
    toggleFavoriteTemplate(id);
    setFavorites(getFavoriteTemplateIds());
  };

  const favoriteTemplates = freeTemplates.filter((t) => favorites.includes(t.id));
  const recentTemplates = recentFromStorage
    .map((r) => freeTemplates.find((t) => t.id === r.id))
    .filter((t): t is TemplateDefinition => !!t);
  const suggestTemplates = freeTemplates.filter(
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
