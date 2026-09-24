import ResumeComponent from "./ResumeComponent"
import ResumeViewer from "./ResumeViewer"
import { ResumeContent } from "@/types/ResumeData"
import { normalizeTemplateId } from "@/lib/templateRenderer"
import viewerStyles from "@/components/resume/ResumeViewer.module.css";
import { useState } from "react"
import { ZoomIn } from "lucide-react"
import UploadedResumeComponent from "./UploadedResume"
import { UploadedResumeViewer } from "./ResumeViewer"

interface ResumePlusViewerProps {
  title?: string;
  templateId: string;
  content: ResumeContent;
  maxHeight?: string;

}

function ResumePlusViewer({title, templateId, content,  maxHeight}: ResumePlusViewerProps ) {
  const [openView, SetOpenView]= useState<boolean>(false);


  return (
    <>
        <div className={viewerStyles.resumeShell} style={ maxHeight? { maxHeight: maxHeight } : {}}>
            <ResumeComponent resumeContent={content} templateId={normalizeTemplateId(templateId)} />
        </div>
        <button type="button" className={viewerStyles.viewBtn} onClick={() => SetOpenView(true)}>
            <ZoomIn size={12} /> View
        </button>
        <ResumeViewer
            isOpen={openView}
            onClose={() => SetOpenView(false)}
            resumeContent={content}
            templateId={normalizeTemplateId(templateId)}
            title={`${title || 'Untitled Resume'}`}
        />
    </>
  )
}

export default ResumePlusViewer


interface UploadedResumePlusViewerProps {
  pages: string[];
  title?: string;
  maxHeight?: string;
}

export function UploadedResumePlusViewer({pages, title, maxHeight}: UploadedResumePlusViewerProps) {
  const [openView, SetOpenView]= useState<boolean>(false);

  return (
    <>
        <div className={viewerStyles.resumeShell} style={ maxHeight? { maxHeight: maxHeight } : {}}>
            <UploadedResumeComponent resumePages={pages} preview={true}/>
        </div>
        <button type="button" className={viewerStyles.viewBtn} onClick={() => SetOpenView(true)}>
            <ZoomIn size={12} /> View
        </button>
        <UploadedResumeViewer
            isOpen={openView}
            onClose={() => SetOpenView(false)}
            pages={pages}
            title={`${title || 'Untitled Resume'}`}
        />
    </>
  )
}