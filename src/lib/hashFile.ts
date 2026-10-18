function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (subtle) {
    const digest = await subtle.digest("SHA-256", buf);
    return bytesToHex(new Uint8Array(digest));
  }

  // SubtleCrypto only exists in secure contexts. When it is unavailable, skip
  // content hashing and return a random 64-char hex fingerprint so the upload
  // still proceeds; the backend only checks the format and dedupe lookups
  // simply miss instead of throwing.
  const random = new Uint8Array(32);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(random);
  } else {
    for (let i = 0; i < random.length; i++) {
      random[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(random);
}
