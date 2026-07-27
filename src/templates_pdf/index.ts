import type { TemplateId } from "@/lib/templateCatalog";
import AtsClassicPdf from "./ats-classic";
import type { FC } from "react";
import type { AtsResumeView } from "@/lib/atsResumeMapper";

export const atsTemplateComponents: Record<string, FC<{ data: AtsResumeView }>> = {
  "ats-classic": AtsClassicPdf,
};

export function getAtsTemplateComponent(templateId: TemplateId): FC<{ data: AtsResumeView }> | null {
  const component = atsTemplateComponents[templateId];
  return component ?? null;
}
