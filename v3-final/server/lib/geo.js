/**
 * Shared geo constants/helpers. Single source of truth for the
 * "Argentina Mode" bounding box so the frontend, API, and any future
 * worker all agree on the same region.
 */
export const ARGENTINA_BBOX = { minLat: -56, maxLat: -21, minLon: -74, maxLon: -53 };

export function isWithinBbox(lat, lon, bbox) {
  return lat != null && lon != null && lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}
