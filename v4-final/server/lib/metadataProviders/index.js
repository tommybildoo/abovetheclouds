import { NullMetadataProvider } from './NullMetadataProvider.js';

/**
 * getMetadataProvider(env) — mirrors getFlightProvider() in
 * server/lib/flightProviders/index.js. Resolution is driven by
 * AIRCRAFT_METADATA_PROVIDER (see .env.example).
 *
 * No metadata provider is integrated yet by design (see README —
 * this was intentionally left unintegrated per the V3.1 audit rather
 * than wiring up a paid provider without your sign-off). To add one:
 *
 *   1. Implement a class extending AircraftMetadataProvider with real
 *      getAircraftMetadata()/getAircraftMetadataBatch() logic.
 *   2. Add its config keys to .env.example
 *      (e.g. AIRCRAFT_METADATA_API_KEY).
 *   3. Register it below behind AIRCRAFT_METADATA_PROVIDER=<your-id>.
 *
 * Nothing else in the app needs to change — functions/api/flights/live.js
 * already calls this factory and merges whatever it returns (or the
 * explicit "unknown" defaults) onto each live position.
 */
export function getMetadataProvider(_env) {
  // Future: if (env.AIRCRAFT_METADATA_PROVIDER === 'some-provider' && SomeProvider.isConfigured(env)) return new SomeProvider(env);
  return new NullMetadataProvider();
}
