export const OLD_BROWSER_TITLE = "Your browser may be out of date";
export const OLD_BROWSER_MESSAGE =
  "This feature might not work on your current browser version. Please update your browser, or try the latest Chrome or Safari, and try again.";

type RequiredFeature = {
  name: string;
  isAvailable: () => boolean;
};

const BASE_FEATURES: RequiredFeature[] = [
  { name: "File", isAvailable: () => typeof File !== "undefined" },
  { name: "Blob", isAvailable: () => typeof Blob !== "undefined" },
  { name: "FileReader", isAvailable: () => typeof FileReader !== "undefined" },
  { name: "FormData", isAvailable: () => typeof FormData !== "undefined" },
  { name: "fetch", isAvailable: () => typeof fetch === "function" },
  { name: "AbortController", isAvailable: () => typeof AbortController !== "undefined" },
];

const PDF_FEATURES: RequiredFeature[] = [
  { name: "HTMLCanvasElement", isAvailable: () => typeof HTMLCanvasElement !== "undefined" },
  {
    name: "CanvasRenderingContext2D",
    isAvailable: () => typeof CanvasRenderingContext2D !== "undefined",
  },
];

const REQUIRED_FEATURE_NAMES = new Set(
  [...BASE_FEATURES, ...PDF_FEATURES].map((feature) => feature.name.toLowerCase())
);

const TYPE_ERROR_PATTERN =
  /is not a function|is not a constructor|cannot read propert|undefined is not an object|null is not an object|not supported|not defined/i;

const NEW_API_PATTERN = /\.toHex is not a function|getOrInsertComputed is not a function/i;

function isClientBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getMissingBrowserFeatures(options: { requireCanvas?: boolean } = {}): string[] {
  if (!isClientBrowser()) return [];

  const features = options.requireCanvas ? [...BASE_FEATURES, ...PDF_FEATURES] : BASE_FEATURES;
  return features.filter((feature) => !feature.isAvailable()).map((feature) => feature.name);
}

export function isBrowserSupported(options: { requireCanvas?: boolean } = {}): boolean {
  return getMissingBrowserFeatures(options).length === 0;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function isTypeErrorLike(error: unknown, message: string): boolean {
  return (
    error instanceof TypeError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "TypeError") ||
    TYPE_ERROR_PATTERN.test(message)
  );
}

function namesMissingFeature(message: string): boolean {
  const missingNames = message.match(/([A-Za-z][A-Za-z0-9_]*)\s+is not defined/);
  if (!missingNames) return false;
  return REQUIRED_FEATURE_NAMES.has(missingNames[1].toLowerCase());
}

export interface UnsupportedBrowserDiagnosis {
  suspected: boolean;
  missingFeatures: string[];
  matchedKnownApi: boolean;
}

export function detectUnsupportedBrowserError(
  error: unknown,
  options: { requireCanvas?: boolean } = {}
): UnsupportedBrowserDiagnosis {
  if (!isClientBrowser()) {
    return { suspected: false, missingFeatures: [], matchedKnownApi: false };
  }

  const message = getErrorMessage(error);
  const missingFeatures = getMissingBrowserFeatures(options);
  const matchedKnownApi = NEW_API_PATTERN.test(message);
  const typeErrorLike = isTypeErrorLike(error, message);
  const requiredFeatureMissing =
    missingFeatures.length > 0 || namesMissingFeature(message);

  return {
    suspected: typeErrorLike && (requiredFeatureMissing || matchedKnownApi),
    missingFeatures,
    matchedKnownApi,
  };
}

export function isLikelyUnsupportedBrowserError(
  error: unknown,
  options: { requireCanvas?: boolean } = {}
): boolean {
  return detectUnsupportedBrowserError(error, options).suspected;
}
