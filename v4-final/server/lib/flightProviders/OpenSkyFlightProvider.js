import { FlightDataProvider } from './FlightDataProvider.js';

/**
 * OpenSky live state-vector provider.
 *
 * Authenticated OAuth2 credentials are preferred. If they are not present,
 * OpenSky's public anonymous tier is used as a fallback. The anonymous tier
 * is rate-limited, so production should use FLIGHT_API_CLIENT_ID/SECRET and
 * the scheduled cache worker rather than calling this on every request.
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
    this._tokenCache = null;
  }

  async _getAccessToken() {
    if (!this.clientId || !this.clientSecret) return null;
    const now = Math.floor(Date.now() / 1000);
    if (this._tokenCache && this._tokenCache.expiresAt > now + 30) return this._tokenCache.accessToken;
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
    if (!res.ok) throw new Error(`OpenSky OAuth token request failed: ${res.status}`);
    const json = await res.json();
    this._tokenCache = {
      accessToken: json.access_token,
      expiresAt: now + (json.expires_in || 1800),
    };
    return this._tokenCache.accessToken;
  }

  async _fetch(path) {
    const token = await this._getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`OpenSky request failed (${res.status}) for ${path}`);
    return res.json();
  }

  _category(code) {
    // OpenSky emitter categories: 2 light, 3 small, 4 large, 5 high-vortex,
    // 6 heavy, 7 high-performance, 8 rotorcraft, 9 glider, 14 UAV, etc.
    if ([4, 5, 6].includes(code)) return 'PASSENGER';
    if ([2, 3, 7, 9, 12].includes(code)) return 'GENERAL_AVIATION';
    if ([8].includes(code)) return 'GENERAL_AVIATION';
    if ([10, 11, 13, 14, 15, 16, 17, 18, 19, 20].includes(code)) return 'UNKNOWN';
    return 'UNKNOWN';
  }

  _normalize(state) {
    const [
      icao24, callsign, originCountry, , , longitude, latitude,
      baroAltitude, onGround, velocity, trueTrack, , , geoAltitude,
      squawk, , , categoryCode,
    ] = state;
    const altitudeM = geoAltitude ?? baroAltitude;
    return {
      icao24,
      callsign: callsign ? callsign.trim() : null,
      registration: null,
      aircraftType: null,
      airline: originCountry || null,
      originIcao: null,
      destinationIcao: null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      altitudeFt: altitudeM != null ? Math.round(altitudeM * 3.28084) : null,
      groundSpeedKt: velocity != null ? Math.round(velocity * 1.94384) : null,
      headingDeg: trueTrack != null ? Math.round(trueTrack) : null,
      category: this._category(categoryCode),
      status: onGround ? 'LANDED' : 'IN_FLIGHT',
      provider: 'opensky',
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  async getLiveFlights(opts = {}) {
    let path = '/states/all?extended=1';
    if (opts.bbox) {
      const { minLat, maxLat, minLon, maxLon } = opts.bbox;
      path += `&lamin=${minLat}&lamax=${maxLat}&lomin=${minLon}&lomax=${maxLon}`;
    }
    const json = await this._fetch(path);
    return (json.states || [])
      .filter((s) => s[6] != null && s[5] != null)
      .map((s) => this._normalize(s));
  }

  async getFlightById(icao24) {
    const json = await this._fetch(`/states/all?icao24=${encodeURIComponent(icao24.toLowerCase())}&extended=1`);
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

  async getAircraftDetails() {
    return null;
  }
}
