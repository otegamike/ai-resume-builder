export function formatDate(iso?: Date | string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function createIdFactory() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text);
    if (!base) return "";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

const HEADING_PATTERN = /<h([23])(\s[^>]*)?>(.*?)<\/h\1>/gi;

export function extractHeadings(html: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const nextId = createIdFactory();
  let match: RegExpExecArray | null;
  while ((match = HEADING_PATTERN.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const text = match[3].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const id = nextId(text);
    if (!id) continue;
    headings.push({ id, text, level });
  }
  return headings;
}

export function injectHeadingIds(html: string): string {
  const nextId = createIdFactory();
  return html.replace(HEADING_PATTERN, (full, level, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const id = nextId(text);
    if (!id) return full;
    const prefix = attrs ?? "";
    return `<h${level}${prefix} id="${id}">${inner}</h${level}>`;
  });
}
