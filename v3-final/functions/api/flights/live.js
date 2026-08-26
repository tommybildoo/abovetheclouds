import { getFlightProvider } from '../../../server/lib/flightProviders/index.js';
import { enrichWithMetadata } from '../../../server/lib/flightEnrichment.js';
import { ARGENTINA_BBOX } from '../../../server/lib/geo.js';
import { d1All, d1Run, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/flights/live?minLat=&maxLat=&minLon=&maxLon=&category=&argentina=1
 *
 * PERFORMANCE / RATE-LIMIT NOTES (see README "Flight refresh & rate
 * limits" for the full picture):
 *  - Serves from the short-lived server-side cache (flights_cache) —
 *    normal page loads never call the external provider directly.
 *  - The cache itself is populated by workers/cron/flight-cache-refresh.js
 *    on its own schedule, NOT once per visitor.
 *  - On the rare cold-start path (cache empty/stale — e.g. right after
 *    first deploy, or if the cron worker lagged), this endpoint pushes
 *    a bounding box DOWN TO THE PROVIDER when one is known, instead of
 *    fetching the whole world and filtering in JS:
 *      - an explicit minLat/maxLat/minLon/maxLon from the map viewport
 *        takes priority (only fetch what's on screen)
 *      - otherwise, argentina=1 uses ARGENTINA_BBOX
 *      - only a fully unfiltered request fetches the whole world
 *  - The flights_cache SQL query is itself bbox-filtered when possible,
 *    so a large global cache doesn't get pulled into JS just to throw
 *    most of it away.
 *
 * Response ALWAYS includes { provider, isLive, updatedAt } so the
 * frontend can render "LIVE" vs "DEMO MODE" and "Updated Xs ago" and
 * never has to guess.
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const argentina = url.searchParams.get('argentina') === '1';
    const minLat = url.searchParams.get('minLat');
    const maxLat = url.searchParams.get('maxLat');
    const minLon = url.searchParams.get('minLon');
    const maxLon = url.searchParams.get('maxLon');

    // Resolve the effective bounding box once — used both to scope the
    // provider request (cold-start path) and to scope the cache query.
    let bbox = null;
    if (minLat && maxLat && minLon && maxLon) {
      bbox = { minLat: +minLat, maxLat: +maxLat, minLon: +minLon, maxLon: +maxLon };
    } else if (argentina) {
      bbox = ARGENTINA_BBOX;
    }

    const provider = getFlightProvider(env);
    const cacheAgeSeconds = 20; // matches the flight-cache-refresh cron interval; see settings table for the configurable value

    // Try cache first (populated by the cron worker for live providers).
    // SQL-level bbox filter avoids reading the full cache table into JS
    // when we already know we only need a region.
    const cacheRows = bbox
      ? await d1All(
          env,
          `SELECT * FROM flights_cache WHERE provider = ? AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? ORDER BY updated_at DESC`,
          provider.id, bbox.minLat, bbox.maxLat, bbox.minLon, bbox.maxLon
        )
      : await d1All(env, `SELECT * FROM flights_cache WHERE provider = ? ORDER BY updated_at DESC`, provider.id);

    // Freshness is judged against the newest row of the *whole* cache
    // (not just this bbox slice), since the cron worker refreshes the
    // whole table together.
    const newestRow = await d1All(env, `SELECT MAX(updated_at) as t FROM flights_cache WHERE provider = ?`, provider.id);
    const newestUpdatedAt = newestRow[0]?.t || 0;
    const freshEnough = newestUpdatedAt > 0 && nowSeconds() - newestUpdatedAt < cacheAgeSeconds * 3;

    let flights;
    let dataUpdatedAt;

    if (provider.isLive && freshEnough) {
      flights = cacheRows;
      dataUpdatedAt = newestUpdatedAt;
    } else {
      // Cold start, demo provider, or cache stale beyond tolerance — fetch
      // directly, scoped to `bbox` when we have one so we never pull the
      // entire world just to serve an Argentina-only view.
      try {
        const live = await provider.getLiveFlights(bbox ? { bbox } : {});
        const enriched = await enrichWithMetadata(env, live);
        flights = enriched.map((f) => ({ ...f }));
        dataUpdatedAt = nowSeconds();

        // Best-effort cache write so subsequent requests are cheap.
        for (const f of flights) {
          await d1Run(
            env,
            `INSERT INTO flights_cache
              (icao24, callsign, registration, aircraft_type, airline, origin_icao, destination_icao,
               latitude, longitude, altitude_ft, ground_speed_kt, heading_deg, category, status, provider, updated_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
             ON CONFLICT(icao24) DO UPDATE SET
               latitude=excluded.latitude, longitude=excluded.longitude, altitude_ft=excluded.altitude_ft,
               ground_speed_kt=excluded.ground_speed_kt, heading_deg=excluded.heading_deg,
               status=excluded.status, updated_at=excluded.updated_at`,
            f.icao24, f.callsign, f.registration, f.aircraftType, f.airline, f.originIcao, f.destinationIcao,
            f.latitude, f.longitude, f.altitudeFt, f.groundSpeedKt, f.headingDeg, f.category, f.status, f.provider, f.updatedAt
          );
        }
      } catch (err) {
        // Provider failed live — be honest instead of fabricating positions.
        return jsonResponse({
          provider: provider.id,
          isLive: provider.isLive,
          flights: [],
          updatedAt: null,
          error: 'LIVE_DATA_UNAVAILABLE',
          message: 'Live data temporarily unavailable.',
        }, { status: 200 });
      }
    }

    let filtered = flights;
    if (category) filtered = filtered.filter((f) => f.category === category);
    if (argentina && !bbox) {
      // Defensive fallback — bbox should already be set whenever argentina=1,
      // but keep a JS-level filter as a safety net in case flights came
      // from an unfiltered cache read for any reason.
      filtered = filtered.filter((f) => f.latitude <= ARGENTINA_BBOX.maxLat && f.latitude >= ARGENTINA_BBOX.minLat && f.longitude <= ARGENTINA_BBOX.maxLon && f.longitude >= ARGENTINA_BBOX.minLon);
    }

    return jsonResponse({
      provider: provider.id,
      isLive: provider.isLive,
      demoMode: !provider.isLive,
      flights: filtered.map((f) => ({
        icao24: f.icao24,
        callsign: f.callsign,
        registration: f.registration ?? null,
        aircraftType: (f.aircraft_type ?? f.aircraftType) ?? null,
        airline: f.airline ?? null,
        originIcao: (f.origin_icao ?? f.originIcao) ?? null,
        destinationIcao: (f.destination_icao ?? f.destinationIcao) ?? null,
        latitude: f.latitude,
        longitude: f.longitude,
        altitudeFt: f.altitude_ft ?? f.altitudeFt,
        groundSpeedKt: f.ground_speed_kt ?? f.groundSpeedKt,
        headingDeg: f.heading_deg ?? f.headingDeg,
        category: f.category,
        status: f.status,
      })),
      updatedAt: dataUpdatedAt,
    });
  } catch (err) {
    return errorResponse(err.message || 'Unexpected error', 500);
  }
}
