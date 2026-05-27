import styles from './loading-component.module.css'
import { LoaderCircle } from 'lucide-react'

interface LoadingComponentProps {
    showLoader: boolean;
    toggleShowLoader: (toggle: boolean) => void;
    containerClassName?: string;
    contentClassName?: string;
    iconClassName?: string;
    loadingText?: string;
}

function LoadingComponent({ showLoader, containerClassName, contentClassName, iconClassName, loadingText }: LoadingComponentProps) {
  return (
    <>
        {showLoader && (
        <div className={`${styles.loading_container} ${containerClassName || ''}`}>
            <div className={`${styles.loading_content} ${contentClassName || ''}`}>
                <LoaderCircle size={35} className={`${styles.loading_icon} ${iconClassName || ''}`} />
                <p>{loadingText}</p>
            </div>
        </div>
        )}
    </>
  )
}

export default LoadingComponent
