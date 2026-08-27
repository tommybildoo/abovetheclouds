/**
 * Frontend mirror of server/lib/countries.js. Kept as a small, separate
 * copy (rather than importing across the client/server boundary) since
 * Vite bundles src/ for the browser and functions/server/ run on the
 * Workers runtime — they are two different build targets. If you add a
 * country here, add the matching entry (with bbox) in
 * server/lib/countries.js too so map/flight scoping works for it.
 */
export const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

// Shown above the search box before the user types anything.
export const POPULAR_CODES = ['AR', 'US', 'GB', 'BR', 'ES'];

export function findCountry(code) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) || null;
}
