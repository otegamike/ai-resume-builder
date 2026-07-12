"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./header.module.css";
import NavBar from "./NavBar";
import HamburgerMenu from "./hamburger-menu/hamburgerMenu";
import { MenuPanelProps } from "./hamburger-menu/hamburgerMenu";
import Logo from "../svgs/logo";
import NavBarCTA from "./NavBarCTA";
import NavPanel from "./NavPanel/NavPanel";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import useMediaQuery from '@/app/hooks/useMediaQuery';
import { Avatar } from "@/components/ui/Avatar/Avatar";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const pathname = usePathname();
  const showNav = pathname === "/" || pathname === "/pricing";
  const showDashboardLink = !pathname.startsWith("/dashboard");
  const isEditorPage = pathname.startsWith("/editor");
  const isAuthPage = pathname.startsWith("/auth/login");
  const { data: session, status } = useSession();
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

  const closeMenu = () => {
    toggleMenu(false);
  }
  

  return (
    <header className={`${styles.header} ${isEditorPage || !showDashboardLink ? styles.fixed : ""}`}>
      <div className={styles.header__boundary}>
      
        <div className={styles.header__content}>
          <Link className={styles.logo} onClick={closeMenu} href="/">
            <Logo size={25} color='var(--primary-1)' />
            <span className={styles.logoText}>
              AgenticApp.cv
            </span>
          </Link>
          <nav className={styles.nav}>
            <div className={styles.nav__panel__container}>
              {mounted && !isMobile && showNav && <NavBar menuState={isMenuOpen} pathname={pathname} />}
            </div>

            {showDashboardLink && !isAuthPage && (
              <NavBarCTA status={status} hideCTA={isMenuOpen} onClick={closeMenu} hideDashboard/>
            )}
            
            {mounted && isSignedIn && !isMenuOpen && (
              <Avatar
                src={session?.user?.image}
                alt={session?.user?.name || session?.user?.email || "User"}
                size={30}
              />
            )}

            {mounted && !isAuthPage && (
              <div id="hamburger-container" className={styles.hamburger}>
                <HamburgerMenu menuPanelProps={menuPanelProps} />
              </div>
            )}
            
          </nav>
        </div>
      </div>

      <NavPanel
        session={session}
        isOpen={isMenuOpen}
        toggleMenu={toggleMenu}
        status={status}
      />
    </header>
  )
}

