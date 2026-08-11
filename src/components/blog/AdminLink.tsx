"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import styles from "./AdminLink.module.css";

export default function AdminLink() {
  const { data: session } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin);

  if (!isAdmin) return null;

  return (
    <Link href="/blog/admin" className={styles.link}>
      Admin
    </Link>
  );
}
