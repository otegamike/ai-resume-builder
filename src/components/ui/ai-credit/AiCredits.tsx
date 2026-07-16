import { Zap } from "lucide-react"
import styles from "./AiCredits.module.css"
import { MAX_CREDITS_PER_PLAN } from "@/lib/creditCosts"

interface AiCreditsProps {
  aiCredit: number | null
  plan: keyof typeof MAX_CREDITS_PER_PLAN
  small?: boolean
  full?: boolean

}

function AiCredits({aiCredit: aiCredit, plan, small, full}: AiCreditsProps) {
  
  const isProPlus = plan === 'proPlus';

  const creditsLeft = aiCredit !== null ? aiCredit : 0
  const maxCredits = MAX_CREDITS_PER_PLAN[plan]
  const percentageLeft = maxCredits > 0 ? (creditsLeft / maxCredits) * 100 : 0

  return (
    <div className={`${styles.creditsBadge} ${small ? styles.small :''} ${full ? styles.full :''}`}
      style={{ '--credits-left': `${isProPlus ? 100 : Math.max((percentageLeft - 3), 0)}%` } as React.CSSProperties}>

        <Zap className={styles.creditsIcon} />
        <span className={styles.creditsValue}>{isProPlus ? 'unlimited' : aiCredit ?? "-"}</span>
        <span className={styles.creditsLabel}>AI Credits</span>
    </div>
  )
}

export default AiCredits