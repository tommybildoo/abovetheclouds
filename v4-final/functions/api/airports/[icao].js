import { d1First, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/** GET /api/airports/:icao */
export async function onRequestGet({ params, env }) {
  try {
    const airport = await d1First(env, `SELECT * FROM airports WHERE icao = ?`, params.icao.toUpperCase());
    if (!airport) return errorResponse('Airport not found', 404);
    return jsonResponse({ airport });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
