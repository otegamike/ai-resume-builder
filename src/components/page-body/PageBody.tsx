"use client"
import styles from "./page-body.module.css"
import { usePathname } from "next/navigation"
interface PageBodyProp {
    children: React.ReactNode;
}

function PageBody({children}:PageBodyProp) {
    const pathname= usePathname();
    const isEditor= pathname.startsWith("/editor");

    return (
        <body className={styles.body} style={isEditor?{overflow: "clip"}: {}} >
            {children}
        </body>
    )
}

export default PageBody