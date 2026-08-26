import { getMetadataProvider } from './metadataProviders/index.js';

/**
 * enrichWithMetadata — merges optional aircraft metadata (type,
 * registration, airline, origin, destination) onto normalized live
 * flight objects, WITHOUT ever fabricating a value.
 *
 * When no metadata provider is configured (the default —
 * NullMetadataProvider), every flight passes through completely
 * unchanged: whatever the flight-data provider itself returned (which,
 * for OpenSky, is already `null` for these fields — see
 * OpenSkyFlightProvider._normalize) is preserved as-is.
 *
 * Used by both the on-demand /api/flights/live cold-start path and the
 * flight-cache-refresh cron worker, so cached and freshly-fetched data
 * go through the exact same enrichment step.
 */
export async function enrichWithMetadata(env, flights) {
  if (!flights.length) return flights;

  const provider = getMetadataProvider(env);
  const icao24s = flights.map((f) => f.icao24);
  const metadataById = await provider.getAircraftMetadataBatch(icao24s);

  return flights.map((f) => {
    const meta = metadataById[f.icao24];
    if (!meta) return f;
    return {
      ...f,
      // Only fill a field if the flight-data provider didn't already
      // supply one — metadata enrichment fills gaps, it never
      // overwrites data the live provider itself reported.
      aircraftType: f.aircraftType ?? meta.aircraftType,
      registration: f.registration ?? meta.registration,
      airline: f.airline ?? meta.airline,
      originIcao: f.originIcao ?? meta.originIcao,
      destinationIcao: f.destinationIcao ?? meta.destinationIcao,
    };
  });
}
