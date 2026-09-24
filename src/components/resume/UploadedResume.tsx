import styles from "./ResumeSelector.module.css";

interface UploadedResumeProps {
  resumePages: string[];
  preview: boolean;
}

function UploadedResumeComponent({ resumePages, preview }: UploadedResumeProps) {
  const pagesToMap = preview ? 1 : resumePages.length;

  return (
    <div className={styles.pdfPreviewContainer}>
      {resumePages.slice(0, pagesToMap).map((url, i) => (
        <img key={i} src={url} alt={`PDF page ${i + 1}`} className={styles.pdfCanvas} />
      ))}
    </div>
  )
}

export default UploadedResumeComponent

