import { Button } from "@/components/ui/Button"
import { ChevronDown, ChevronUp, Palette } from "lucide-react"
import { useState } from "react"
import styles from "./page.module.css"
import type { TemplateDefinition, TemplateId } from "@/lib/templateCatalog"

interface TemplateSelectorProps {
  templateDefinitions: TemplateDefinition[]
  template: TemplateId
  selectedTemplate?: TemplateDefinition
  changeTemplate: (templateId: TemplateId) => void
}

function TemplateSelector({templateDefinitions, template, selectedTemplate, changeTemplate}: TemplateSelectorProps) {

    const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  return (
          <div className={styles.relative}>
            <Button 
              variant="light_outline" 
              size="sm"
              onClick={() => setShowTemplatePicker(!showTemplatePicker)}
              className={styles.templateButton}
            >
              <Palette color='var(--neutral-100)' className={styles.aiButtonIcon} />
              {selectedTemplate?.name || "Template"}

              {showTemplatePicker ? 
                <ChevronUp color='var(--neutral-100)' className={styles.aiButtonIcon} /> 
                : <ChevronDown color='var(--neutral-100)' className={styles.aiButtonIcon} />
              }
            </Button>
            {showTemplatePicker && (
              <div className={styles.dropdown}>
                {templateDefinitions.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => changeTemplate(t.id)}
                    className={`${styles.dropdown_option} ${template === t.id ? styles.templateOptionActive : ''}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
  )
}

export default TemplateSelector