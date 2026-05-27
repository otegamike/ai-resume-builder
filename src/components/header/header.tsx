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
import { useSession } from "next-auth/react";
import useMediaQuery from '@/app/hooks/useMediaQuery';

export default function Header() {
  const pathname = usePathname();
  const isHome =  pathname === "/";
  const showDashboardLink = !pathname.startsWith("/dashboard");
  const isAuthPage = pathname.startsWith("/auth/login");
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const isMobile = useMediaQuery(640); // Example breakpoint for mobile devices

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
            {isHome && <NavBar menuState={isMenuOpen} />}
          </div>

          {!isSignedIn && !isAuthPage && (
            <span className={styles.clerk_button}>
              <Link href="/auth/login">
                <Button size="sm">Sign In</Button>
              </Link>
            </span>
          )}

          {isSignedIn && showDashboardLink && !isAuthPage && (
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          )}

          {!isAuthPage && isMobile && (
            <div className={styles.hamburger}>
              <HamburgerMenu menuPanelProps={menuPanelProps} />
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
