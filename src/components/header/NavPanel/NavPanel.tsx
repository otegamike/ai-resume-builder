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
  const pathname = usePathname();
  const [panelRight, setPanelRight] = useState(getDistanceFromRight('hamburger-container') || 0);
  const [panelTop, setPanelTop] = useState(getHeaderHeight() || 50);

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
  const userEmail = session?.user?.email
  const subscriptionPlan = isSignedIn ? session?.user?.subscriptionPlan : null
  const aiCredits = isSignedIn ? session?.user?.AiCredits : null

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
              <div className={styles.creditsRow}>
                <span className={styles.creditsLabel}>AI Credits : </span>
                <span className={styles.creditsValue}>{aiCredits ?? "—"}</span>
              </div>
            )}
          </div>

          <div className={styles.actionsSection}>
            <NavBarCTA status={status} buttonSize='md' onClick={handleLinkClick} />
            

            {isSignedIn && (
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
            )}
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
