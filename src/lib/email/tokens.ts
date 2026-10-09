/**
 * Brand tokens for email templates, read from `src/styles/variables.css`.
 * Email clients ignore external CSS, so these are inlined as style strings.
 * Do not invent new colors here; update variables.css first.
 */
export const brand = {
  primary: "#779f6d",
  primaryDark: "#4f6a49",
  primarySoft: "#e8f0e5",
  leaf: "#a2cb8b",
  text: "#111a14",
  muted: "#6b7280",
  border: "#e5e7eb",
  background: "#fdfdfd",
  surface: "#ffffff",
  error: "#dc2626",
} as const;

export const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const contentWidth = 600;
