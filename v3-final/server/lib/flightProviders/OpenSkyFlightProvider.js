import { FlightDataProvider } from './FlightDataProvider.js';

/**
 * OpenSkyFlightProvider — talks to the OpenSky Network REST API.
 *
 * https://openskynetwork.github.io/opensky-api/rest.html
 *
 * OpenSky uses OAuth2 client-credentials for authenticated (higher rate
 * limit) access. Credentials are read from Worker secrets and NEVER sent
 * to the browser — this class only ever runs server-side (Pages
 * Functions / Workers), never in frontend JS.
 *
 * Required env (see .env.example):
 *   FLIGHT_API_CLIENT_ID
 *   FLIGHT_API_CLIENT_SECRET
 *   FLIGHT_API_BASE_URL   (defaults to https://opensky-network.org/api)
 *
 * Anonymous access is possible but is rate-limited far more aggressively
 * by OpenSky, so this provider treats missing credentials as "not
 * configured" and the app falls back to DemoFlightProvider instead of
 * silently hammering the anonymous tier from every visitor.
 */
export class OpenSkyFlightProvider extends FlightDataProvider {
  id = 'opensky';
  isLive = true;

  constructor(env) {
    super();
    this.baseUrl = env.FLIGHT_API_BASE_URL || 'https://opensky-network.org/api';
    this.clientId = env.FLIGHT_API_CLIENT_ID;
    this.clientSecret = env.FLIGHT_API_CLIENT_SECRET;
    this.tokenUrl = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
    this._tokenCache = null; // { accessToken, expiresAt } kept in-memory for the life of the isolate
  }

  static isConfigured(env) {
    return Boolean(env.FLIGHT_API_CLIENT_ID && env.FLIGHT_API_CLIENT_SECRET);
  }

  async _getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (this._tokenCache && this._tokenCache.expiresAt > now + 30) {
      return this._tokenCache.accessToken;
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      throw new Error(`OpenSky OAuth token request failed: ${res.status}`);
    }
    const json = await res.json();
    this._tokenCache = {
      accessToken: json.access_token,
      expiresAt: now + (json.expires_in || 1800),
    };
    return this._tokenCache.accessToken;
  }

  async _authedFetch(path) {
    const token = await this._getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`OpenSky request failed (${res.status}) for ${path}`);
    }
    return res.json();
  }

  _normalize(state) {
    // OpenSky /states/all row format (positional array):
    // [icao24, callsign, origin_country, time_position, last_contact,
    //  longitude, latitude, baro_altitude, on_ground, velocity,
    //  true_track, vertical_rate, sensors, geo_altitude, squawk,
    //  spi, position_source, category]
    const [
      icao24, callsign, , , ,
      longitude, latitude, , onGround, velocity, trueTrack, , , geoAltitude,
    ] = state;

    const altitudeM = geoAltitude ?? state[7];
    return {
      icao24,
      callsign: callsign ? callsign.trim() : null,
      registration: null, // OpenSky states/all does not include registration directly
      aircraftType: null, // would require a metadata lookup / aircraft database join
      airline: null,
      originIcao: null,
      destinationIcao: null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      altitudeFt: altitudeM != null ? Math.round(altitudeM * 3.28084) : null,
      groundSpeedKt: velocity != null ? Math.round(velocity * 1.94384) : null,
      headingDeg: trueTrack != null ? Math.round(trueTrack) : null,
      category: 'UNKNOWN', // OpenSky's `category` field is often 0/unset; left honest rather than guessed
      status: onGround ? 'LANDED' : 'IN_FLIGHT',
      provider: 'opensky',
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  async getLiveFlights(opts = {}) {
    let path = '/states/all';
    if (opts.bbox) {
      const { minLat, maxLat, minLon, maxLon } = opts.bbox;
      path += `?lamin=${minLat}&lamax=${maxLat}&lomin=${minLon}&lomax=${maxLon}`;
    }
    const json = await this._authedFetch(path);
    return (json.states || []).filter((s) => s[6] != null && s[5] != null).map((s) => this._normalize(s));
  }

  async getFlightById(icao24) {
    const json = await this._authedFetch(`/states/all?icao24=${icao24.toLowerCase()}`);
    const state = (json.states || [])[0];
    return state ? this._normalize(state) : null;
  }

  async getFlightsNearLocation({ lat, lon, radiusKm = 300 }) {
    const degLat = radiusKm / 111;
    const degLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    return this.getLiveFlights({
      bbox: { minLat: lat - degLat, maxLat: lat + degLat, minLon: lon - degLon, maxLon: lon + degLon },
    });
  }

  async getAircraftDetails(_registrationOrType) {
    // OpenSky's metadata (aircraft database) endpoint requires a separate
    // dataset/lookup not covered by /states/all. Left as a documented
    // extension point rather than faking a response.
    return null;
  }
}
