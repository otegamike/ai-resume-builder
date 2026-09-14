"use client";

import { useMemo } from "react";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { buildTemplateSrcDoc, getTemplatePreviewData } from "@/lib/templateRenderer";
import type { TemplateDefinition } from "@/lib/templateCatalog";
import ResumeComponent from "@/components/resume/ResumeComponent";
import styles from "../page.module.css";

interface TemplateTabProps {
  selectedTemplate?: TemplateDefinition;
  toggleTemplatePicker: (toggle?: boolean) => void;
}

export default function TemplateTab({ selectedTemplate, toggleTemplatePicker }: TemplateTabProps) {
  const previewData = useMemo(() => getTemplatePreviewData(), []);
  

  return (
    <div className={styles.formSection}>
            <div className={styles.formSectionHeader}>
              <h2 className={styles.formSectionTitle}>Select Template</h2>
            </div>
        <div className={styles.templateTabContainer}>
          <ResumeComponent templateId={selectedTemplate?.id || 'template1'} resumeContent={previewData} />
          <p className={styles.templateDescription}>
            {selectedTemplate?.description ?? "Choose a design that fits your style. You can change it anytime."}
          </p>
          <Button onClick={() => toggleTemplatePicker(true)}>
            <Palette className={styles.templateButtonIcon} />
            {selectedTemplate ? "Change Template" : "Choose Template"}
          </Button>
        </div>
      </div>
  );
}
