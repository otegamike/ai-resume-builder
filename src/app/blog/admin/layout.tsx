import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BlogAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    redirect("/blog");
  }

  return <div className={styles.container__wrapper}>{children}</div>;
}
