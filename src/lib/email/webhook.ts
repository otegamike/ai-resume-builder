import "server-only";

import crypto from "crypto";

export interface SvixHeaders {
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}

function keyBytes(secret: string): Buffer {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(raw, "base64");
}

/**
 * Verify a Resend (Svix-signed) webhook. The signature covers the raw request
 * body: HMAC-SHA256 over `{svix-id}.{svix-timestamp}.{rawBody}`, base64
 * encoded. Multiple signatures may be present during secret rotation; any
 * match is valid. Rejects timestamps further than 5 minutes out (replay bound).
 */
export function verifySvixSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string,
  nowMs: number = Date.now()
): boolean {
  if (!rawBody || !headers.svixId || !headers.svixTimestamp || !headers.svixSignature || !secret) {
    return false;
  }
  const timestampSeconds = Number(headers.svixTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(nowMs - timestampSeconds * 1000) > 5 * 60_000) return false;

  let key: Buffer;
  try {
    key = keyBytes(secret);
  } catch {
    return false;
  }
  const signed = `${headers.svixId}.${headers.svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signed).digest();
  const candidates = headers.svixSignature.split(" ").map((part) => part.replace(/^v1,/, ""));
  for (const candidate of candidates) {
    let actual: Buffer;
    try {
      actual = Buffer.from(candidate, "base64");
    } catch {
      continue;
    }
    if (actual.length !== expected.length) continue;
    if (crypto.timingSafeEqual(actual, expected)) return true;
  }
  return false;
}

/** Test helper: sign a payload the same way Resend does. */
export function signTestPayload(rawBody: string, headers: SvixHeaders, secret: string): string {
  const signed = `${headers.svixId}.${headers.svixTimestamp}.${rawBody}`;
  const digest = crypto.createHmac("sha256", keyBytes(secret)).update(signed).digest("base64");
  return `v1,${digest}`;
}
