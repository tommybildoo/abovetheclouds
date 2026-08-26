import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/** GET /api/airports?argentina=1 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const argentinaOnly = url.searchParams.get('argentina') === '1';
    const rows = argentinaOnly
      ? await d1All(env, `SELECT * FROM airports WHERE is_argentina = 1 ORDER BY name`)
      : await d1All(env, `SELECT * FROM airports ORDER BY name`);
    return jsonResponse({ airports: rows });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
