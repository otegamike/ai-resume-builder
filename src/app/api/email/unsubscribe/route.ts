import { NextResponse } from "next/server";
import { verifyUnsubscribeToken, applyUnsubscribe } from "@/lib/email/unsubscribe";

export const dynamic = "force-dynamic";

/**
 * Signed one-click unsubscribe (used from Phase 2 job alerts onward).
 * No user-controlled recipient addresses: the token itself identifies the
 * user, so this endpoint cannot be used as a spam relay.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const decoded = verifyUnsubscribeToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }
  const updated = await applyUnsubscribe(decoded.userId, decoded.type).catch((error) => {
    console.error("Unsubscribe failed:", error);
    return false;
  });
  if (!updated) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, unsubscribed: decoded.type });
}
