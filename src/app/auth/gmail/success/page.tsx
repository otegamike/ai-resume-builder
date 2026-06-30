"use client";

import { useEffect } from "react";

export default function GmailSuccessPage() {
  useEffect(() => {
    // Notify the parent window that authentication was successful
    if (window.opener) {
      window.opener.postMessage("gmail_auth_success", window.location.origin);
      window.close();
    } else {
      // If opened directly (not as a popup), just redirect to dashboard
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h2>Successfully Connected Gmail!</h2>
        <p>You can close this window if it doesn't close automatically.</p>
      </div>
    </div>
  );
}
