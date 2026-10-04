import styles from './StepIndicator.module.css'
import { Check } from 'lucide-react'

function StepIndicator({ totalSteps, step }: { totalSteps: number, step: number }) {
  return (
    <div className={styles.stepIndicator}>
        {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className={`${styles.stepDot} ${i === step ? styles.stepDotActive : ""} ${i < step ? styles.stepDotDone : ""}`}>
            {i===step ? <span>STEP {i + 1}</span> : i < step ? <Check className={styles.stepDotIcon} /> : <span>{i + 1}</span>}
        </div>
        ))}
    </div>
  )
}

export default StepIndicator