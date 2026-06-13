"use client"

import styles from './navpanel.module.css'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import { Session } from 'next-auth'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { usePathname } from 'next/navigation'


interface NavPanelProps {
  session: Session | null
  isOpen: boolean
  toggleMenu: (menuState?: boolean) => void
  status: "authenticated" | "loading" | "unauthenticated"
}

function formatPlan(plan: string | null | undefined): string {
  switch (plan) {
    case "proPlus": return "Pro+"
    case "pro": return "Pro"
    case "free": return "Free"
    default: return "Free"
  }
}

function NavPanel({ session, isOpen, toggleMenu, status }: NavPanelProps) {
  const pathname = usePathname()
  const isSignedIn = status === "authenticated"
  const userName = session?.user?.name || "Guest"
  const userImage = session?.user?.image
  const userEmail = session?.user?.email
  const subscriptionPlan = isSignedIn ? session?.user?.subscriptionPlan : null
  const aiCredits = isSignedIn ? session?.user?.AiCredits : null

  const handleLinkClick = () => {
    toggleMenu(false)
  }

  const handleOverlayClick = () => {
    toggleMenu(false)
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        <div className={styles.content}>
          <div className={styles.userSection}>
            <Avatar
              src={userImage}
              alt={userName}
              size={55}
            />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName}</span>
              {isSignedIn && (
                <span className={styles.subscriptionBadge}>
                  {formatPlan(subscriptionPlan)}
                </span>
              )}
            </div>
            {isSignedIn && (
              <div className={styles.creditsRow}>
                <span className={styles.creditsLabel}>AI Credits : </span>
                <span className={styles.creditsValue}>{aiCredits ?? "—"}</span>
              </div>
            )}
          </div>

          <div className={styles.actionsSection}>
            {status === "loading" ? null : isSignedIn ? (
              <Link href="/dashboard" onClick={handleLinkClick}>
                <Button size="md" fullWidth>Dashboard</Button>
              </Link>
            ) : (
              <Link href="/auth/login" onClick={handleLinkClick}>
                <Button size="sm" fullWidth>Sign In</Button>
              </Link>
            )}

            <div className={styles.secondaryLinks}>
              <Link
                href="/dashboard/tailor"
                className={styles.secondaryLink}
                onClick={handleLinkClick}
              >
                Tailor
              </Link>
              <Link
                href="/dashboard/improve"
                className={styles.secondaryLink}
                onClick={handleLinkClick}
              >
                Improve
              </Link>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <Link
              href="/templates"
              className={`${styles.navLink} ${pathname === "/templates" ? styles.navLinkActive : ''}`}
              onClick={handleLinkClick}
            >
              Template Gallery
            </Link>
            <Link
              href="/#features"
              className={styles.navLink}
              onClick={handleLinkClick}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className={`${styles.navLink} ${pathname === "/pricing" ? styles.navLinkActive : ''}`}
              onClick={handleLinkClick}
            >
              Pricing
            </Link>
          </nav>
        </div>
      </div>
    </>
  )
}

export default NavPanel
