import { getFlightProvider } from '../../../server/lib/flightProviders/index.js';
import { jsonResponse, errorResponse } from '../../../server/lib/db.js';

/** GET /api/flights/:id — details for a single aircraft by icao24. */
export async function onRequestGet({ params, env }) {
  try {
    const provider = getFlightProvider(env);
    const flight = await provider.getFlightById(params.id);
    if (!flight) return errorResponse('Flight not found', 404);
    return jsonResponse({ provider: provider.id, isLive: provider.isLive, flight });
  } catch (err) {
    return errorResponse(err.message || 'Unexpected error', 500);
  }
}
