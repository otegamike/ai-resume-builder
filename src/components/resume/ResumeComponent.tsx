"use client";

import { ResumeContent } from "@/types/ResumeData";
import { buildTemplateSrcDoc} from "@/lib/templateRenderer";
import { type TemplateId } from "@/lib/templateCatalog";
import ResumeIframe from "./ResumeIframe";
import { useTemplateStore } from "@/store/useTemplateStore";
import { normalizeTemplateId } from "@/lib/templateRenderer";
import { isProTemplate } from "@/lib/templateCatalog";
import { Crown } from "lucide-react";
import iframeStyles from '@/components/resume/iframe.module.css'

interface RendererOpts {
  editorMode?: boolean;
  showProStatus?: boolean;
}

interface ResumeComponentProps {
  resumeContent: ResumeContent;
  templateId: TemplateId | string;
  renderOpts?: RendererOpts;
}

function ResumeComponent({ resumeContent, templateId, renderOpts }: ResumeComponentProps) {

  const nomalizedTemplateId = normalizeTemplateId(templateId);
  const isPro = isProTemplate(nomalizedTemplateId);

  const html = useTemplateStore((state) => state.getTemplateById(nomalizedTemplateId)?.html) ?? "";

  const renderedTemplate = html && resumeContent
    ? buildTemplateSrcDoc(html, resumeContent, renderOpts)
    : "";

  return (
    <div className='relative'>
      {isPro && (
        <span className={iframeStyles.proBadge}>
          <Crown size={10} /> Pro
        </span>
      )}
      
      <ResumeIframe
        renderedTemplate={renderedTemplate}
        type="preview"
      />
    </div>
  );
}

export default ResumeComponent;
