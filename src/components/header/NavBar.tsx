import styles from "./header.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function NavBar({ menuState }: { menuState: boolean }) {
    const [display, setDisplay] = useState<boolean>(false);
    const [animate, setAnimate] = useState<boolean>(false);

    useEffect(() => {
       if (menuState) {
        setDisplay(menuState);
            setTimeout(() => {
                setAnimate(menuState);
            }, 50);
       } else {
            setAnimate(menuState);
            setTimeout(() => {
                setDisplay(menuState);
            }, 500);
       }
        
    }, [menuState]);

    return (
        <>
        { display && 
            <div className={` ${styles.nav__panel__wrapper} ${animate ? styles.openTab : styles.closeTab}`}>
                <ul className={styles.nav__panel}>
                    <Link className={styles.navLink} href="/templates">
                    <li>Templates</li> 
                    </Link>
                    <Link className={styles.navLink} href="#features">
                        <li>Features</li>
                    </Link>
                    <Link className={styles.navLink} href="#pricing">
                        <li>Pricing</li>
                    </Link>
                </ul>
            </div>
        
        }
        
        </>
    )
}   
