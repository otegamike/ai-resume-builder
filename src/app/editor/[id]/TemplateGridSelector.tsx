"use client"

import { useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { ChevronDown, ChevronUp, Palette } from "lucide-react"
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer"
import type { TemplateDefinition, TemplateId } from "@/lib/templateCatalog"
import styles from "./templateGridSelector.module.css"
import ResumeIframe from "@/components/resume/ResumeIframe"

interface TemplateGridSelectorProps {
  templateDefinitions: TemplateDefinition[]
  template: TemplateId
  selectedTemplate?: TemplateDefinition
  showTemplatePicker: boolean
  toggleTemplatePicker: (toggle?: boolean) => void
  changeTemplate: (templateId: TemplateId) => void
}

function TemplateGridSelector({
  templateDefinitions,
  template,
  selectedTemplate,
  changeTemplate,
  showTemplatePicker,
  toggleTemplatePicker,
}: TemplateGridSelectorProps) {
  const previewData = useMemo(() => getTemplatePreviewData(), [])
  const wrapperRef = useRef<HTMLDivElement>(null)

  const renderedTemplates = useMemo(() => {
    return templateDefinitions.map((t) => ({
      id: t.id,
      html: buildTemplateSrcDoc(t.html, previewData),
    }))
  }, [templateDefinitions, previewData])

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
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Choose a Template</span>
            <span className={styles.panelCount}>{templateDefinitions.length} templates</span>
          </div>

          <div className={styles.gridScrollContainer}>
            <div className={styles.grid}>
              {templateDefinitions.map((t, i) => {
                const isActive = template === t.id
                return (
                  <button
                    key={t.id}
                    className={`${styles.card} ${isActive ? styles.active : ""}`}
                    onClick={() => changeTemplate(t.id)}
                    aria-label={`Select ${t.name}${isActive ? " (active)" : ""}`}
                  >
                    <div className={styles.preview}>
                      <ResumeIframe 
                        renderedTemplate={renderedTemplates[i].html}
                      />
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
