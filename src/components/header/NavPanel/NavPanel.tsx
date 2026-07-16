"use client"

import styles from './navpanel.module.css'
import { Avatar } from '@/components/ui/Avatar/Avatar'
import { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { getDistanceFromRight } from '@/utils/elementPosition'
import NavBarCTA from '../NavBarCTA'
import { getHeaderHeight } from '@/utils/headerSize'
import AiCredits from '@/components/ui/ai-credit/AiCredits'
import { useAiCreditStore } from '@/store/useAiCreditStore'
import { formatPlan, MAX_CREDITS_PER_PLAN } from '@/lib/creditCosts'

interface NavPanelProps {
  session: Session | null
  isOpen: boolean
  toggleMenu: (menuState?: boolean) => void
  status: "authenticated" | "loading" | "unauthenticated"
}

const primaryLinks = [
  { href: "/templates", label: "Template Gallery" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" }
];

const secondaryLinks = [
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/tailor", label: "Tailor" },
  { href: "/dashboard/improve", label: "Improve" }
];



function NavPanel({ session, isOpen, toggleMenu, status }: NavPanelProps) {
  const pathname = usePathname();
  const [panelRight, setPanelRight] = useState(0);
  const [panelTop, setPanelTop] = useState(0);
  const storeCredits = useAiCreditStore((s) => s.credits);

  const updatePanelPosition = useCallback(() => {
    setPanelRight(getDistanceFromRight('hamburger-container'))
    setPanelTop(getHeaderHeight())
  }, [isOpen])

  useEffect(() => {
    updatePanelPosition()
    window.addEventListener('resize', updatePanelPosition)
    return () => window.removeEventListener('resize', updatePanelPosition)
  }, [updatePanelPosition])

  const isSignedIn = status === "authenticated"
  const userName = session?.user?.name || "Guest"
  const userImage = session?.user?.image
  const subscriptionPlan = isSignedIn ? session?.user?.subscriptionPlan : null
  const plan = (subscriptionPlan ?? "free") as keyof typeof MAX_CREDITS_PER_PLAN

  const handleLinkClick = () => {
    toggleMenu(false)
  }

  const handleOverlayClick = () => {
    toggleMenu(false)
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
    toggleMenu(false)
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        style={{"--header-height": `${panelTop}px`} as React.CSSProperties}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`} style={{ right: `calc(${panelRight}px - 1rem)`,"--header-height": `${panelTop}px`} as React.CSSProperties}>
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
              <AiCredits aiCredit={storeCredits ?? session?.user?.AiCredits ?? null} plan={plan} small full />
            )}
          </div>

          <div className={styles.actionsSection}>
            <NavBarCTA status={status} buttonSize='md' onClick={handleLinkClick} />
            

            {isSignedIn && (
              <div className={styles.secondaryLinks}>
                {secondaryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={styles.secondaryLink}
                    onClick={handleLinkClick}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <nav className={styles.navLinks}>
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
                onClick={handleLinkClick}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {isSignedIn && (
            <div className={styles.signOutButtonContainer}>
              <button className={styles.signOutButton} onClick={handleSignOut}>
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NavPanel
