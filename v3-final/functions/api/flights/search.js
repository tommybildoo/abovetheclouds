import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/flights/search?q=AR1234
 * Searches the current live/demo cache by callsign, registration, or icao24.
 * Only searches cached data — never fabricates a match.
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim().toUpperCase();
    if (!q) return errorResponse('Missing query parameter q', 400);

    const rows = await d1All(
      env,
      `SELECT * FROM flights_cache WHERE UPPER(callsign) LIKE ? OR UPPER(registration) LIKE ? OR UPPER(icao24) LIKE ? LIMIT 20`,
      `%${q}%`, `%${q}%`, `%${q}%`
    );
    return jsonResponse({ results: rows });
  } catch (err) {
    return errorResponse(err.message || 'Unexpected error', 500);
  }
}
