import { ResumeContent } from "@/types/ResumeData";
import { buildTemplateSrcDoc} from "@/lib/templateRenderer";
import { type TemplateId } from "@/lib/templateCatalog";
import ResumeIframe from "./ResumeIframe";
import { useState } from "react";
import { templateDefinitions } from "@/lib/templateCatalog";


interface RendererOpts {
  editorMode?: boolean;
}

interface ResumeComponentProps {
  resumeContent: ResumeContent;
  templateId: TemplateId;
  templateHtml?: string;
  renderOpts?: RendererOpts;
}

function ResumeComponent({ resumeContent, templateId, templateHtml, renderOpts }: ResumeComponentProps) {

  const templateDef = templateDefinitions.find((t) => t.id === templateId);
  const html = templateHtml || templateDef?.html || "";

  const renderedTemplate = html && resumeContent
    ? buildTemplateSrcDoc(html, resumeContent, renderOpts)
    : "";

  const [showLoader, setShowLoader] = useState(true);

  const toggleShowLoader = (toggle?: boolean) => {
    setShowLoader((prev) => toggle ?? !prev);
  };


  return (
    <ResumeIframe
      renderedTemplate={renderedTemplate}
      type="preview"
    />
  );
}

export default ResumeComponent;
