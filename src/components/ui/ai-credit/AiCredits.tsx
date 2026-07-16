import { Zap } from "lucide-react"
import styles from "./AiCredits.module.css"

interface AiCreditsProps {
  aiCredit: number | null
  small?: boolean
  full?: boolean
}

function AiCredits({aiCredit: aiCredit, small, full}: AiCreditsProps) {
  return (
    <div className={`${styles.creditsBadge} ${small ? styles.small :''} ${full ? styles.full :''}`}>

        <Zap className={styles.creditsIcon} />
        <span className={styles.creditsValue}>{aiCredit ?? "—"}</span>
        <span className={styles.creditsLabel}>AI Credits</span>
    </div>
  )
}

export default AiCredits