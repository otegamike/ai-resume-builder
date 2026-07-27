import { createElement, useMemo } from "react";
import { PDFViewer } from "@react-pdf/renderer";
import { getAtsTemplateComponent } from "@/templates_pdf";
import type { TemplateId } from "@/lib/templateCatalog";
import type { AtsResumeView } from "@/lib/atsResumeMapper";

interface AdminPdfViewerProps {
  data: AtsResumeView;
  templateId: TemplateId;
}

function AdminPdfViewer({ data, templateId }: AdminPdfViewerProps) {
  const PdfComponent = useMemo(() => getAtsTemplateComponent(templateId), [templateId]);

  if (!PdfComponent) {
    return (
      <div style={{ padding: 24, color: "#666", fontFamily: "monospace", fontSize: 14 }}>
        No React-PDF component registered for &quot;{templateId}&quot;
      </div>
    );
  }

  return createElement(
    PDFViewer,
    {
      style: {
        width: "100%",
        height: "100%",
        border: "none",
        minHeight: 600,
      },
      showToolbar: true,
    },
    createElement(PdfComponent, { data }),
  );
}

export default AdminPdfViewer;
