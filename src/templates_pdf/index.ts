import type { TemplateId } from "@/lib/templateCatalog";
import AtsClassicPdf from "./ats-classic";
import AtsModernPdf from "./ats-modern";
import AtsCompactPdf from "./ats-compact";
import AtsExecutivePdf from "./ats-executive";
import AtsMinimalPdf from "./ats-minimal";
import AtsDarkPdf from "./ats-dark";
import type { FC } from "react";
import type { AtsResumeView } from "@/lib/atsResumeMapper";

export const atsTemplateComponents: Record<string, FC<{ data: AtsResumeView }>> = {
  "ats-classic": AtsClassicPdf,
  "ats-modern": AtsModernPdf,
  "ats-compact": AtsCompactPdf,
  "ats-executive": AtsExecutivePdf,
  "ats-minimal": AtsMinimalPdf,
  "ats-dark": AtsDarkPdf,
};

export function getAtsTemplateComponent(templateId: TemplateId): FC<{ data: AtsResumeView }> | null {
  const component = atsTemplateComponents[templateId];
  return component ?? null;
}
