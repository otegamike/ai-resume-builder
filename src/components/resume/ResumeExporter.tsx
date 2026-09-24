
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
} from "react";

import { ResumeContent } from "@/types/ResumeData";
import { exportResumeAsPdf } from "@/utils/exportUtils";
import { exportResumeAsAtsPdf } from "@/utils/atsExportUtils";
import { TEMPLATE_PAGE } from "@/lib/templateCatalog";
import { mapResumeToAtsView } from "@/lib/atsResumeMapper";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { useTemplateStore } from "@/store/useTemplateStore";

export interface ResumeExporterRef {
  download: (name: string) => Promise<void>;
}

interface ResumeExporterProps {
  resumeContent: ResumeContent;
  templateId: string;
}

const ResumeExporter = forwardRef<
  ResumeExporterRef,
  ResumeExporterProps
>(
  (
    {
      resumeContent,
      templateId,
    },
    ref
  ) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    
    const html = useTemplateStore((s) => s.getTemplateById(templateId)?.html) ?? "";

    const renderedTemplate = useMemo(() => {
      if (!html || !resumeContent) return "";
      return buildTemplateSrcDoc(html, resumeContent, { editorMode: true });
    }, [html, resumeContent]);

    const atsViewData = useMemo(() => {
      if (!templateId.startsWith("ats-") || !resumeContent) return null;
      return mapResumeToAtsView(resumeContent);
    }, [templateId, resumeContent]);
    
    useImperativeHandle(ref, () => ({
      download: async (name: string) => {
        // ATS export
        if (templateId.startsWith("ats-") && atsViewData) {
          await exportResumeAsAtsPdf(
            name,
            resumeContent,
            templateId
          );

          return;
        }

        // Normal template export
        const iframe = iframeRef.current;

        if (!iframe || !renderedTemplate) {
          throw new Error("Export iframe is not ready");
        }

        const doc = iframe.contentDocument;

        if (!doc) {
          throw new Error("Could not access export iframe document");
        }

        doc.open();
        doc.write(renderedTemplate);
        doc.close();

        // Give the iframe time to render
        await new Promise((resolve) => setTimeout(resolve, 300));

        await exportResumeAsPdf(
          iframeRef as React.RefObject<HTMLIFrameElement>,
          name,
          TEMPLATE_PAGE.widthPx,
          TEMPLATE_PAGE.heightPx
        );
      },
    }));

    return (
      <iframe
        ref={iframeRef}
        title="export-hidden"
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: "794px",
          height: "5000px",
          border: 0,
          visibility: "hidden",
        }}
        sandbox="allow-same-origin"
      />
    );
  }
);

ResumeExporter.displayName = "ResumeExporter";

export default ResumeExporter;
