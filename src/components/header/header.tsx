"use client";

import Link from "next/link";
import { ClerkProvider, Show, SignInButton, UserButton } from '@clerk/nextjs';
import { usePathname } from "next/navigation";
import styles from "./header.module.css";
import NavBar from "./NavBar";
import HamburgerMenu from "./hamburger-menu/hamburgerMenu";
import { MenuPanelProps } from "./hamburger-menu/hamburgerMenu";
import { Button } from "../ui/Button";
import Logo from "../svgs/logo";

import { useState } from "react";

export default function Header() {
  const pathname = usePathname();
  const showNavbar = pathname === "/";
  const showDashboardLink = pathname !== "/dashboard";

  const [ isMenuOpen, setIsMenuOpen ] = useState<boolean>(false);

  const toggleMenu = (menuState?: boolean) => {
    setIsMenuOpen(prevState => menuState !== undefined ? menuState : !prevState); 
  }

  const menuPanelProps: MenuPanelProps = {
    isMenuOpen,
    toggleMenu
  }

  return (
    <ClerkProvider>
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

                
                <Show when="signed-out">
                    <span className={styles.clerk_button} >
                        <SignInButton />
                    </span>
                </Show>

                <Show when="signed-in">
                    {showDashboardLink && (
                        <Link href="/dashboard">
                            <Button size="sm">Dashboard</Button>
                        </Link>
                    )}
                </Show>

                <Show when="signed-in">
                    <UserButton />
                </Show>

                <div className={styles.hamburger}>
                    <HamburgerMenu menuPanelProps={menuPanelProps} />
                </div>

                </nav>
            </div>
        </header>
      </ClerkProvider>
  )
}
