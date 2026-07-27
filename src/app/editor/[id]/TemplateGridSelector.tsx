"use client"

import { useMemo, useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { ChevronDown, ChevronUp, Palette, Lock, Crown } from "lucide-react"
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer"
import type { TemplateDefinition, TemplateId } from "@/lib/templateCatalog"
import styles from "./templateGridSelector.module.css"
import ResumeIframe from "@/components/resume/ResumeIframe"
import { useAlertStore } from "@/store/useAlertStore"

type TabId = "free" | "pro";

interface TemplateGridSelectorProps {
  templateDefinitions: TemplateDefinition[]
  template: TemplateId
  selectedTemplate?: TemplateDefinition
  showTemplatePicker: boolean
  toggleTemplatePicker: (toggle?: boolean) => void
  changeTemplate: (templateId: TemplateId) => void
  userPlan?: string | null;
}

function TemplateGridSelector({
  templateDefinitions,
  template,
  selectedTemplate,
  changeTemplate,
  showTemplatePicker,
  toggleTemplatePicker,
  userPlan,
}: TemplateGridSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("free");
  const previewData = useMemo(() => getTemplatePreviewData(), [])
  const wrapperRef = useRef<HTMLDivElement>(null)

  const isProOrAbove = userPlan === "pro" || userPlan === "proPlus";

  const freeTemplates = useMemo(
    () => templateDefinitions.filter((t) => t.tier === "free"),
    [templateDefinitions],
  );
  const proTemplates = useMemo(
    () => templateDefinitions.filter((t) => t.tier === "pro"),
    [templateDefinitions],
  );

  const currentTemplates = activeTab === "free" ? freeTemplates : proTemplates;

  const renderedTemplates = useMemo(() => {
    return currentTemplates.map((t) => ({
      id: t.id,
      html: buildTemplateSrcDoc(t.html, previewData),
    }))
  }, [currentTemplates, previewData])

  useEffect(() => {
    if (!showTemplatePicker) return
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        toggleTemplatePicker(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleTemplatePicker(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [showTemplatePicker, toggleTemplatePicker])

  const handleCardClick = (t: TemplateDefinition) => {
    if (t.tier === "pro" && !isProOrAbove) {
      useAlertStore.getState().addAlert("info", "Upgrade to Pro to access ATS-optimized templates");
      return;
    }
    changeTemplate(t.id);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <Button
        variant="light_outline"
        size="sm"
        className={styles.triggerButton}
        onClick={() => toggleTemplatePicker()}
        aria-expanded={showTemplatePicker}
        aria-haspopup="dialog"
      >
        <Palette color="var(--neutral-100)" className={styles.triggerIcon} />
        {selectedTemplate?.name || "Template"}
        {showTemplatePicker ? (
          <ChevronUp color="var(--neutral-100)" className={styles.triggerIcon} />
        ) : (
          <ChevronDown color="var(--neutral-100)" className={styles.triggerIcon} />
        )}
      </Button>

      {showTemplatePicker && (
        <div className={styles.panel} role="dialog" aria-label="Choose a template">
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${activeTab === "free" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("free")}
            >
              Templates
            </button>
            <button
              className={`${styles.tab} ${activeTab === "pro" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("pro")}
            >
              ATS (Pro)
            </button>
          </div>

          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              {activeTab === "free" ? "Choose a Template" : "ATS-Optimized Templates"}
            </span>
            <span className={styles.panelCount}>{currentTemplates.length} templates</span>
          </div>

          <div className={styles.gridScrollContainer}>
            <div className={styles.grid}>
              {currentTemplates.map((t, i) => {
                const isActive = template === t.id
                const isLocked = t.tier === "pro" && !isProOrAbove;
                return (
                  <button
                    key={t.id}
                    className={`${styles.card} ${isActive ? styles.active : ""} ${isLocked ? styles.locked : ""}`}
                    onClick={() => handleCardClick(t)}
                    aria-label={`Select ${t.name}${isActive ? " (active)" : ""}${isLocked ? " (locked)" : ""}`}
                  >
                    {t.tier === "pro" && <span className={styles.proBadge}><Crown size={10} /> Pro</span>}
                    <div className={`${styles.preview} ${isLocked ? styles.previewLocked : ""}`}>
                      <ResumeIframe 
                        renderedTemplate={renderedTemplates[i].html}
                      />
                      {isLocked && (
                        <div className={styles.lockOverlay}>
                          <Lock size={24} />
                        </div>
                      )}
                    </div>
                    <div className={styles.cardLabel}>
                      {isActive && <span className={styles.activeDot} />}
                      <span className={styles.cardName}>{t.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateGridSelector
