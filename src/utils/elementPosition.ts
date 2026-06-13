export function getElementRect(id: string): DOMRect | null {
  if (typeof document === 'undefined') return null;
  const el = document.getElementById(id);
  return el?.getBoundingClientRect() ?? null;
}

export function getDistanceFromRight(id: string): number {
  const rect = getElementRect(id);
  if (!rect) return 0;

  const header = document.querySelector('header');
  if (!header) return 0;

  const headerRect = header.getBoundingClientRect();
  return headerRect.right - rect.right;
}
