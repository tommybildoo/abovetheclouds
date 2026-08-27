import { DemoFlightProvider } from './DemoFlightProvider.js';
import { OpenSkyFlightProvider } from './OpenSkyFlightProvider.js';

/** Select the configured provider. OpenSky can use its public anonymous tier
 * when OAuth credentials are not configured; authenticated credentials are
 * still strongly recommended for production rate limits. */
export function getFlightProvider(env) {
  const selected = (env.FLIGHT_DATA_PROVIDER || 'demo').toLowerCase();
  if (selected === 'opensky') return new OpenSkyFlightProvider(env);
  return new DemoFlightProvider();
}
