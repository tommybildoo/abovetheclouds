/**
 * Frontend-safe configuration. NOTHING secret goes in this file — it is
 * bundled into client JS. API keys/secrets live only in Cloudflare
 * Pages secrets and are read by functions/ and workers/ (server-side).
 */
export const CONFIG = {
  instagramUrl: 'https://instagram.com/abovetheclouds.arg',
  siteUrl: 'https://abovetheclouds.arg',
  flightRefreshIntervalSeconds: 20,
};
