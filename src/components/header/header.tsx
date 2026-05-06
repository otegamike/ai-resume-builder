"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./header.module.css";
import NavBar from "./NavBar";
import HamburgerMenu from "./hamburger-menu/hamburgerMenu";
import { MenuPanelProps } from "./hamburger-menu/hamburgerMenu";
import { Button } from "../ui/Button";
import Logo from "../svgs/logo";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const pathname = usePathname();
  const showDashboardLink = pathname !== "/dashboard";
  const { status } = useSession();
  const isSignedIn = status === "authenticated";

  const [ isMenuOpen, setIsMenuOpen ] = useState<boolean>(false);

  const toggleMenu = (menuState?: boolean) => {
    setIsMenuOpen(prevState => menuState !== undefined ? menuState : !prevState); 
  }

  const menuPanelProps: MenuPanelProps = {
    isMenuOpen,
    toggleMenu
  }

  return (
    <header className={styles.header}>
      <div className={styles.header__content}>
        <Link className={styles.logo} href="/">
          <Logo size={20} color='var(--primary-1)' />
          <span className={styles.logoText}>
            Agentic CV
          </span>
        </Link>
        <nav className={styles.nav}>
          <div className={styles.nav__panel__container}>
            <NavBar menuState={isMenuOpen} />
          </div>

          {!isSignedIn && (
            <span className={styles.clerk_button}>
              <Button size="sm" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
                Sign In
              </Button>
            </span>
          )}

          {isSignedIn && showDashboardLink && (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          )}

          {isSignedIn && (
            <Button size="sm" variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign Out
            </Button>
          )}

          <div className={styles.hamburger}>
            <HamburgerMenu menuPanelProps={menuPanelProps} />
          </div>
        </nav>
      </div>
    </header>
  )
}
