const FAVORITES_KEY = "templateFavorites";
const RECENT_KEY = "recentlyUsedTemplates";

export function getFavoriteTemplateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteTemplate(id: string): boolean {
  const favs = getFavoriteTemplateIds();
  const index = favs.indexOf(id);
  if (index === -1) {
    favs.push(id);
  } else {
    favs.splice(index, 1);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return index === -1;
}

export function isTemplateFavorite(id: string): boolean {
  return getFavoriteTemplateIds().includes(id);
}

export function addRecentlyUsedTemplate(id: string, name: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const recent: { id: string; name: string; timestamp: number }[] = raw
      ? JSON.parse(raw)
      : [];
    const filtered = recent.filter((r) => r.id !== id);
    filtered.unshift({ id, name, timestamp: Date.now() });
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 5)));
  } catch {
    // ignore
  }
}

export function getRecentlyUsedTemplates(): { id: string; name: string; timestamp: number }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
