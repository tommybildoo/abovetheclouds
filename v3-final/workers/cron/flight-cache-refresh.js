import { getFlightProvider } from '../../server/lib/flightProviders/index.js';
import { enrichWithMetadata } from '../../server/lib/flightEnrichment.js';
import { d1Run } from '../../server/lib/db.js';

/**
 * Scheduled worker — refreshes the flights_cache table from the
 * configured live provider (no-op cost-wise for the demo provider,
 * which is synthetic). This is what keeps /api/flights/live fast and
 * avoids calling the external API once per visitor.
 *
 * RATE LIMITS: this worker fetches the WORLDWIDE dataset on its own
 * schedule (see flight-cache-refresh.wrangler.toml — default every 1
 * minute), independent of any single visitor's viewport. Per-request
 * scoping (e.g. "only Argentina") happens at read time in
 * functions/api/flights/live.js, which pushes a bounding box to the
 * provider directly ONLY on a cache-miss/cold-start — normal traffic
 * always reads this pre-populated cache instead of calling the
 * provider. Tune the cron interval in the .wrangler.toml file based on
 * your actual provider tier's rate limit; OpenSky's anonymous tier is
 * far more restrictive than its authenticated tier.
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refresh(env));
  },
  async fetch(_request, env) {
    const result = await refresh(env);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  },
};

async function refresh(env) {
  const provider = getFlightProvider(env);
  if (!provider.isLive) {
    const result = { skipped: true, reason: 'Demo provider does not need server-side caching (synthetic data).' };
    console.log('[flight-cache-refresh]', JSON.stringify(result));
    return result;
  }
  try {
    const raw = await provider.getLiveFlights();
    console.log('[flight-cache-refresh] OpenSky returned', raw.length, 'flights');
    const flights = await enrichWithMetadata(env, raw);
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
    const result = { refreshed: flights.length, provider: provider.id };
    console.log('[flight-cache-refresh] SUCCESS', JSON.stringify(result));
    return result;
  } catch (err) {
    const result = { error: err.message, provider: provider.id };
    console.error('[flight-cache-refresh] ERROR', JSON.stringify(result), err.stack);
    return result;
  }
}
