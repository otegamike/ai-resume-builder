/**
 * Capitalizes the first letter of a string.
 * Example: "hello world" -> "Hello world"
 */
export function capitalize(str: string): string {
  if (!str) return "";
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Capitalizes the first letter of every word (Title Case).
 * Example: "senior software engineer" -> "Senior Software Engineer"
 */
export function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase());
}

/**
 * Capitalizes the first letter of every sentence.
 * Example: "hello world. good morning!" -> "Hello world. Good morning!"
 */
export function capitalizeSentences(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .replace(/(^\w|[\.\?!]\s+\w)/g, (match) => match.toUpperCase());
}