/**
 * Curated country list for AboveTheClouds personalization.
 * Kept intentionally small (per the spec: "no quiero una lista gigante
 * desordenada") — popular aviation markets first. Extend this array to
 * support more countries; nothing else needs to change as long as a
 * bbox is provided (used for map/flight scoping) — countries without a
 * bbox still work everywhere EXCEPT the live-map "MY COUNTRY" scoping,
 * which gracefully falls back to global (see server/lib/geo.js).
 */
export const COUNTRIES = [
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', bbox: { minLat: -56, maxLat: -21, minLon: -74, maxLon: -53 } },
  { code: 'US', name: 'United States', flag: '🇺🇸', bbox: { minLat: 24, maxLat: 50, minLon: -125, maxLon: -66 } },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', bbox: { minLat: 49.8, maxLat: 60.9, minLon: -8.7, maxLon: 1.8 } },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', bbox: { minLat: -33.7, maxLat: 5.3, minLon: -74, maxLon: -34.8 } },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', bbox: { minLat: -56, maxLat: -17.5, minLon: -76, maxLon: -66 } },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', bbox: { minLat: -35, maxLat: -30, minLon: -58.5, maxLon: -53 } },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', bbox: { minLat: 36, maxLat: 43.8, minLon: -9.3, maxLon: 4.3 } },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', bbox: { minLat: 14.5, maxLat: 32.7, minLon: -118.4, maxLon: -86.7 } },
  { code: 'FR', name: 'France', flag: '🇫🇷', bbox: { minLat: 41.3, maxLat: 51.1, minLon: -5.1, maxLon: 9.6 } },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', bbox: { minLat: 47.3, maxLat: 55.1, minLon: 5.9, maxLon: 15.0 } },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', bbox: { minLat: 22.6, maxLat: 26.1, minLon: 51.5, maxLon: 56.4 } },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', bbox: { minLat: -43.7, maxLat: -10.4, minLon: 112.9, maxLon: 153.7 } },
];

export function findCountry(code) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code.toUpperCase()) || null;
}
