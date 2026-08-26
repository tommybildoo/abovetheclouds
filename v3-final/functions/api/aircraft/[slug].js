import { d1First, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { getFlightProvider } from '../../../server/lib/flightProviders/index.js';

/** GET /api/aircraft/:slug — full profile for one aircraft page (SEO route /aircraft/:slug). */
export async function onRequestGet({ params, env }) {
  try {
    const aircraft = await d1First(env, `SELECT * FROM aircraft WHERE slug = ?`, params.slug);
    if (!aircraft) return errorResponse('Aircraft not found', 404);

    const provider = getFlightProvider(env);
    // "TRACK THIS AIRCRAFT" support: surface how many are currently in the cache/live feed of this type.
    // Left as a count-only signal here to avoid overfetching; the live map does the full filtering.
    return jsonResponse({ aircraft, provider: provider.id, isLive: provider.isLive });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
