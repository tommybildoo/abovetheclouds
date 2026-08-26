import { DemoFlightProvider } from './DemoFlightProvider.js';
import { OpenSkyFlightProvider } from './OpenSkyFlightProvider.js';

/**
 * getFlightProvider(env) — the ONLY place in the app that decides which
 * flight data source is active. Every API route calls this instead of
 * importing a specific provider directly.
 *
 * Resolution order:
 *   1. FLIGHT_DATA_PROVIDER=opensky AND credentials present  -> OpenSkyFlightProvider (isLive: true)
 *   2. anything else                                          -> DemoFlightProvider (isLive: false)
 *
 * This function never throws for missing config — a misconfigured or
 * unset provider degrades to demo mode rather than breaking the site,
 * per the "everything must work before credentials exist" requirement.
 */
export function getFlightProvider(env) {
  const selected = (env.FLIGHT_DATA_PROVIDER || 'demo').toLowerCase();

  if (selected === 'opensky' && OpenSkyFlightProvider.isConfigured(env)) {
    return new OpenSkyFlightProvider(env);
  }

  // Add future providers here, e.g.:
  // if (selected === 'adsbexchange' && AdsbExchangeProvider.isConfigured(env)) { ... }

  return new DemoFlightProvider();
}
