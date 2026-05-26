import styles from './iframe.module.css';
import { useEffect, useState } from 'react';
import LoadingComponent from '../ui/LoadingComponent';
export type IframeRef = HTMLIFrameElement | null;

interface loaderObjProps {
  showLoader: boolean;
  toggleShowLoader: (toggle: boolean) => void;
}

interface ResumeIframeProps {
    renderedTemplate: string;
    iframeRef?: React.Ref<IframeRef>;
    type?: 'preview' | 'export';
    editorMode?: boolean;
    // loaderObj is used to control the loader from parent component when the iframe is in editor mode, it can come from parent component or from the iframe itself
    loaderObj?: loaderObjProps;
}
    
function ResumeIframe({ renderedTemplate, iframeRef, type, editorMode = false, loaderObj }: ResumeIframeProps) {
    const [resumePages, setResumePages] = useState(1);
    const exportFrame = type === 'export';

    const [showLoader, setShowLoader] = useState(true);

    const toggleShowLoader = (toggle?: boolean) => {
        setShowLoader(prev => toggle??!prev);
    }

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'RESIZE_IFRAME' && typeof event.data.pages === 'number') {
            editorMode && setResumePages(event.data.pages);
            loaderObj? loaderObj.toggleShowLoader(false) : toggleShowLoader(false);
          }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
      }, []);


  return (
    <div 
      className={exportFrame ? '' : `${styles.iframeCanvas} hideScrollbar`}
      style={{ aspectRatio: `794 / ${1123 * resumePages}` }}>
        <iframe
            ref={iframeRef}
            srcDoc={renderedTemplate}
            title={`Resume ${type || 'preview'}`}
            className={exportFrame ? styles.exportFrame : styles.previewFrame}
            sandbox={`allow-same-origin ${exportFrame ? '' : 'allow-scripts'}`}
        />
        <LoadingComponent 
            showLoader={loaderObj?.showLoader ?? showLoader} 
            toggleShowLoader={toggleShowLoader} 
            containerClassName={styles.loadingContainer}
            contentClassName={styles.loadingContent}
        />
    </div>
  )
}

export default ResumeIframe