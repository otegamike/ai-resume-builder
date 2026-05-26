import styles from "./iframe.module.css";
import { Resume } from "@/types/ResumeData";
import { buildTemplateSrcDoc, normalizeTemplateId } from "@/lib/templateRenderer";
import { type TemplateDefinition } from "@/lib/templateCatalog";
import ResumeIframe from "./ResumeIframe";
import { useState, useEffect } from "react";

interface RendererOpts {
  editorMode?: boolean;
} 



interface ResumeComponentProps {
  resume: Resume;
  templateDef: TemplateDefinition;
  renderOpts?: RendererOpts;
}

function ResumeComponent({ resume, templateDef, renderOpts }: ResumeComponentProps) {

  // build template srcDoc
  const templateId = normalizeTemplateId(resume.template);
  const renderedTemplate = templateDef?.html && resume.content 
  ? buildTemplateSrcDoc(templateDef.html, resume.content, renderOpts) 
  : '';

  const [showLoader, setShowLoader] = useState(true);

  const toggleShowLoader = (toggle?: boolean) => {
      setShowLoader(prev => toggle??!prev);
  }

    
  return (
    <ResumeIframe 
      renderedTemplate={renderedTemplate} 
      type="preview"  
      loaderObj={{ showLoader, toggleShowLoader }}
    />

  )
}

export default ResumeComponent
