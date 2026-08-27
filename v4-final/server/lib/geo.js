/**
 * Shared geo constants/helpers. ARGENTINA_BBOX is kept exactly as-is
 * for backward compatibility with existing ?argentina=1 callers.
 * getCountryBbox() generalizes the same idea to any country in
 * server/lib/countries.js — used by V4's "MY COUNTRY" personalization.
 */
import { findCountry } from './countries.js';

export const ARGENTINA_BBOX = { minLat: -56, maxLat: -21, minLon: -74, maxLon: -53 };

export function isWithinBbox(lat, lon, bbox) {
  return lat != null && lon != null && lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

/**
 * Returns the bbox for a country code, or null if the country isn't
 * in the curated list / has no bbox — callers must treat null as "no
 * country-scoping available" and gracefully fall back to global,
 * never as an error (a country without map data must not break the
 * app — see V4 spec section 12).
 */
export function getCountryBbox(countryCode) {
  const country = findCountry(countryCode);
  return country?.bbox || null;
}
