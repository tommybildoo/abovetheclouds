import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/airports?country=AR   (V4 — preferred)
 * GET /api/airports?argentina=1  (legacy alias, still supported)
 * GET /api/airports              (all)
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const argentinaOnly = url.searchParams.get('argentina') === '1';
    const country = url.searchParams.get('country');

    let rows;
    if (country) {
      rows = await d1All(env, `SELECT * FROM airports WHERE country_code = ? ORDER BY name`, country.toUpperCase());
    } else if (argentinaOnly) {
      rows = await d1All(env, `SELECT * FROM airports WHERE is_argentina = 1 ORDER BY name`);
    } else {
      rows = await d1All(env, `SELECT * FROM airports ORDER BY name`);
    }
    return jsonResponse({ airports: rows });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
