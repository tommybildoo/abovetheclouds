import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/** GET /api/aircraft — list, data-driven from D1 (see database/migrations). */
export async function onRequestGet({ env }) {
  try {
    const rows = await d1All(env, `SELECT * FROM aircraft ORDER BY manufacturer, model`);
    return jsonResponse({ aircraft: rows });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
