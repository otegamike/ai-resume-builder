import React from "react";
import { pdf } from "@react-pdf/renderer";
import type { ResumeContent } from "@/types/ResumeData";
import type { TemplateId } from "@/lib/templateCatalog";
import { buildPdfRenderModel } from "@/lib/pdf/renderModel";
import { ResumePdfDocument } from "@/lib/pdf/ResumePdfDocument";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportResumePdf(resume: ResumeContent, templateId: TemplateId, filename: string) {
  const renderModel = buildPdfRenderModel(resume);
  const document = <ResumePdfDocument resume={renderModel} templateId={templateId} />;
  const blob = await pdf(document).toBlob();
  triggerDownload(blob, filename);
}
