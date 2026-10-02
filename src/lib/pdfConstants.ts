export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const MAX_PDF_PAGES = 3;

export const STALE_EXTRACTION_MS = 5 * 60 * 1000;

export const FILE_HASH_PATTERN = /^[a-f0-9]{64}$/;

// Bump this version string whenever AI prompt, model, or parsing schema changes.
// Lives here (not in server-only ai/client) so the browser can compare it too.
export const EXTRACTION_VERSION = "v1";
