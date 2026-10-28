"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import * as Sentry from "@sentry/nextjs";

export default function SentryUserSync() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (status === "loading") return;

    if (userId) {
      Sentry.setUser({ id: String(userId) });
    } else {
      Sentry.setUser(null);
    }
  }, [status, userId]);

  return null;
}
