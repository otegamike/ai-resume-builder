"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./header.module.css";
import NavBar from "./NavBar";
import HamburgerMenu from "./hamburger-menu/hamburgerMenu";
import { MenuPanelProps } from "./hamburger-menu/hamburgerMenu";
import Logo from "../svgs/logo";
import NavBarCTA from "./NavBarCTA";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useMediaQuery from '@/app/hooks/useMediaQuery';

export default function Header() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const pathname = usePathname();
  const showNav = pathname === "/" || pathname === "/pricing";
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
            {showNav && <NavBar menuState={isMenuOpen} pathname={pathname} />}
          </div>

          {showDashboardLink && !isAuthPage && (
            <NavBarCTA status={status} />
          )}

          {mounted && !isAuthPage && isMobile && (
            <div className={styles.hamburger}>
              <HamburgerMenu menuPanelProps={menuPanelProps} />
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

