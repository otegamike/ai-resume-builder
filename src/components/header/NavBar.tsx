import styles from "./header.module.css";
import Link from "next/link";

export default function NavBar() {
    return (
        <>
        
        <div className={styles.nav__panel}>
            <Link className={styles.navLink} href="/templates">
                Templates
            </Link>
            <Link className={styles.navLink} href="#features">
                Features
            </Link>
            <Link className={styles.navLink} href="#pricing">
                Pricing
            </Link>
        </div>

        </>
    )
}   
