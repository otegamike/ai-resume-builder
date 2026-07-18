import { Zap } from "lucide-react"
import Link from "next/link"
import styles from "./AiCredits.module.css"
import { MAX_CREDITS_PER_PLAN } from "@/lib/creditCosts"

interface AiCreditsProps {
  aiCredit: number | null
  plan: keyof typeof MAX_CREDITS_PER_PLAN
  small?: boolean
  full?: boolean
  wrapperClassName?: string

}

function AiCredits({aiCredit, plan, small, full, wrapperClassName}: AiCreditsProps) {
  
  const isProPlus = plan === 'proPlus';

  const creditsLeft = aiCredit !== null ? aiCredit : 0
  const maxCredits = MAX_CREDITS_PER_PLAN[plan]
  const percentageLeft = maxCredits > 0 ? (creditsLeft / maxCredits) * 100 : 0
  const isLow = !isProPlus && maxCredits > 0 && creditsLeft <= maxCredits * 0.2

  return (
    <div className={`${styles.wrapper} ${full ? styles.wrapperFull : ''} ${wrapperClassName || ''}`}>
      <div className={`${styles.creditsBadge} ${small ? styles.small :''} ${full ? styles.full :''} ${isLow ? styles.low : ''}`}
        style={{ '--credits-left': `${isProPlus ? 100 : Math.max((percentageLeft - 3), 0)}%` } as React.CSSProperties}>

          <Zap className={styles.creditsIcon} />
          <span className={styles.creditsValue}>{isProPlus ? 'unlimited' : `${creditsLeft.toLocaleString()} / ${maxCredits.toLocaleString()}`}</span>
          <span className={styles.creditsLabel}>AI Credits</span>
      </div>
      {isLow && (
        <p className={`${styles.upgradePrompt} ${small ? styles.upgradePromptSmall : ''}`}>
          Low on credits?{' '}
          <Link href="/pricing" className={styles.upgradeLink}>
            {small ? 'Upgrade' : `Upgrade to ${plan === 'free' ? 'Pro' : 'Pro+'}`}
          </Link>
        </p>
      )}
    </div>
  )
}

export default AiCredits
