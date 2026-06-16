import { Zap } from "lucide-react"
import styles from "./AiCredits.module.css"

interface AiCreditsProps {
  aiCredit: number | null
}

function AiCredits({aiCredit: aiCredit}: AiCreditsProps) {
  return (
    <div className={styles.creditsBadge}>
        <Zap className={styles.creditsIcon} />
        <span className={styles.creditsValue}>{aiCredit ?? "—"}</span>
        <span className={styles.creditsLabel}>AI Credits</span>
    </div>
  )
}

export default AiCredits