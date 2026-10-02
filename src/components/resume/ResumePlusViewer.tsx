import ResumeComponent from "./ResumeComponent"
import ResumeViewer from "./ResumeViewer"
import { ResumeContent, UploadedResumeClient } from "@/types/ResumeData"
import { normalizeTemplateId } from "@/lib/templateRenderer"
import styles from "@/components/resume/ResumePlusViewer.module.css";
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
        <div className={styles.resumeShell} style={ maxHeight? { maxHeight: maxHeight } : {}}>
            <ResumeComponent resumeContent={content} templateId={normalizeTemplateId(templateId)} />
            
            <button type="button" className={styles.viewBtn} onClick={() => SetOpenView(true)}>
                <ZoomIn size={12} /> View
            </button>
        </div>
        
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
  resume: UploadedResumeClient;
  maxHeight?: string;
}

export function UploadedResumePlusViewer({resume, maxHeight}: UploadedResumePlusViewerProps) {
  const [openView, SetOpenView]= useState<boolean>(false);

  return (
    <>
        <div className={styles.resumeShell} style={ maxHeight? { maxHeight: maxHeight } : {}}>
            <UploadedResumeComponent resume={resume} preview={true}/>

            <button type="button" className={styles.viewBtn} onClick={() => SetOpenView(true)}>
                <ZoomIn size={12} /> View
            </button>
        </div>

        <UploadedResumeViewer
            isOpen={openView}
            onClose={() => SetOpenView(false)}
            resume={resume}
        />
    </>
  )
}