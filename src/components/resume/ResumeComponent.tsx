"use client";

import { ResumeContent } from "@/types/ResumeData";
import { buildTemplateSrcDoc} from "@/lib/templateRenderer";
import { type TemplateId } from "@/lib/templateCatalog";
import ResumeIframe from "./ResumeIframe";
import { useTemplateStore } from "@/store/useTemplateStore";

interface RendererOpts {
  editorMode?: boolean;
}

interface ResumeComponentProps {
  resumeContent: ResumeContent;
  templateId: TemplateId;
  renderOpts?: RendererOpts;
}

function ResumeComponent({ resumeContent, templateId, renderOpts }: ResumeComponentProps) {
  const html = useTemplateStore((state) => state.getTemplateById(templateId)?.html) ?? "";

  const renderedTemplate = html && resumeContent
    ? buildTemplateSrcDoc(html, resumeContent, renderOpts)
    : "";

  return (
    <ResumeIframe
      renderedTemplate={renderedTemplate}
      type="preview"
    />
  );
}

export default ResumeComponent;
