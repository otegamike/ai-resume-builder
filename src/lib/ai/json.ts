import "server-only";

export function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseJsonObject<T>(value: string): T {
  const cleaned = stripJsonFence(value);

  // Attempt 1: direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // Attempt 2: extract outermost { }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {}
  }

  throw new Error(`AI returned unparseable JSON. Raw: ${value.slice(0, 300)}`);
}

export function parseJsonArray<T>(value: string): T[] {
  const cleaned = stripJsonFence(value);

  // Attempt 1: direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {}

  // Attempt 2: extract outermost [ ]
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T[];
    } catch {}
  }

  throw new Error(`AI returned unparseable JSON array. Raw: ${value.slice(0, 300)}`);
}
