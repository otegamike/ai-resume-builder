export async function hashFile(file: File): Promise<string> {
  const subtle = window.crypto?.subtle;
  if (!subtle) {
    throw new Error("Resume processing requires a secure context (HTTPS or localhost).");
  }
  const buf = await file.arrayBuffer();
  const digest = await subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}
