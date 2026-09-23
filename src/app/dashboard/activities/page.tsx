"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ActivitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.replace("/dashboard");
      return;
    }
    router.replace("/dashboard/admin");
  }, [status, session, router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
      <Loader2 style={{ width: 32, height: 32, animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}
