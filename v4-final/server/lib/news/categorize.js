/**
 * Lightweight keyword-based categorizer. Not ML, not perfect — but
 * transparent, fast, free, and easy for a non-programmer to tune by
 * editing the keyword lists below. A `news_sources.category` default
 * can also override/seed this per-source.
 */
const RULES = [
  { category: 'ARGENTINA', keywords: ['argentina', 'aerolíneas', 'aerolineas', 'buenos aires', 'ezeiza', 'aeroparque', 'córdoba', 'cordoba', 'ushuaia', 'mendoza', 'bariloche'] },
  { category: 'MILITARY', keywords: ['air force', 'fighter jet', 'military', 'f-35', 'f-16', 'defense', 'nato', 'squadron'] },
  { category: 'GENERAL_AVIATION', keywords: ['general aviation', 'cessna', 'piper', 'private pilot', 'light aircraft', 'homebuilt', 'gliding', 'ultralight'] },
  { category: 'SPACE', keywords: ['spacex', 'nasa', 'rocket launch', 'rocket', 'satellite', 'orbital', 'starship'] },
  { category: 'AIRPORTS', keywords: ['airport', 'runway', 'terminal', 'atc tower', 'faa', 'air traffic control'] },
  { category: 'AIRLINES', keywords: ['airline', 'carrier', 'flight attendant', 'frequent flyer', 'loyalty program'] },
  { category: 'TECHNOLOGY', keywords: ['engine', 'avionics', 'software', 'ai', 'battery', 'hydrogen', 'sustainable aviation fuel', 'saf'] },
  { category: 'AIRCRAFT', keywords: ['boeing', 'airbus', 'embraer', 'bombardier', '737', '320', '350', '787', 'aircraft delivery'] },
];

export function categorize(title, summary) {
  const text = `${title} ${summary || ''}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.category;
  }
  return 'INDUSTRY';
}

/** Stable dedupe key when a feed item has no reliable guid. */
export async function hashKey(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
