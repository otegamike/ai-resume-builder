import styles from "./ResumeSelector.module.css";
import type { UploadedResumeClient } from "@/types/ResumeData";

interface UploadedResumeProps {
  resume: UploadedResumeClient;
  preview: boolean;
}

function UploadedResumeComponent({ resume, preview }: UploadedResumeProps) {
  const pages = resume.pages ?? [];
  const pagesToMap = preview ? 1 : pages.length;

  return (
    <div className={styles.pdfPreviewContainer}>
      {pages.slice(0, pagesToMap).map((url, i) => (
        <img key={i} src={url} alt={`PDF page ${i + 1}`} className={styles.pdfCanvas} draggable={false} />
      ))}
    </div>
  )
}

export default UploadedResumeComponent

