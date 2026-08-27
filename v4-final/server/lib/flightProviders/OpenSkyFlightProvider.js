import { FlightDataProvider } from './FlightDataProvider.js';

/**
 * Live flight provider.
 *
 * OpenSky is the preferred source when OAuth is reachable. When OpenSky's
 * auth/API edge is unavailable, fall back to ADSB.lol for a regional live
 * snapshot so the map does not go blank.
 *
 * NOTE: OpenSky's current terms require written permission for operational
 * use in a live product. ADSB.lol is ODbL and asks production users to
 * contact them first. Verify licensing before commercial launch.
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
    this.adsbBaseUrl = env.FLIGHT_FALLBACK_API_BASE_URL || 'https://api.adsb.lol';
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

  async _fetchOpenSky(path) {
    const token = await this._getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!res.ok) throw new Error(`OpenSky request failed (${res.status}) for ${path}`);
    return res.json();
  }

  _category(code) {
    if ([4, 5, 6].includes(code)) return 'PASSENGER';
    if ([2, 3, 7, 8, 9, 12].includes(code)) return 'GENERAL_AVIATION';
    if ([10, 11, 13, 14, 15, 16, 17, 18, 19, 20].includes(code)) return 'UNKNOWN';
    return 'UNKNOWN';
  }

  _normalizeOpenSky(state) {
    const [
      icao24, callsign, originCountry, , , longitude, latitude,
      baroAltitude, onGround, velocity, trueTrack, , , geoAltitude,
      , , , categoryCode,
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

  _normalizeAdsb(ac) {
    const alt = typeof ac.alt_geom === 'number' ? ac.alt_geom : ac.alt_baro;
    const category = String(ac.category || '').toUpperCase();
    const isHeavy = ['A5', 'A6', 'A7'].includes(category);
    const isRotor = category.startsWith('A7') || category.startsWith('A8');
    return {
      icao24: ac.hex || null,
      callsign: ac.flight ? ac.flight.trim() : null,
      registration: ac.r || null,
      aircraftType: ac.t || null,
      airline: ac.ownOp || null,
      originIcao: null,
      destinationIcao: null,
      latitude: ac.lat ?? null,
      longitude: ac.lon ?? null,
      altitudeFt: typeof alt === 'number' ? Math.round(alt) : null,
      groundSpeedKt: typeof ac.gs === 'number' ? Math.round(ac.gs) : null,
      headingDeg: typeof ac.track === 'number' ? Math.round(ac.track) : null,
      category: isHeavy ? 'PASSENGER' : (isRotor ? 'GENERAL_AVIATION' : 'PASSENGER'),
      status: typeof ac.alt_baro === 'string' && ac.alt_baro === 'ground' ? 'LANDED' : 'IN_FLIGHT',
      provider: 'adsb.lol',
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  async _fetchAdsbPoint(lat, lon, radiusNm = 250) {
    const url = `${this.adsbBaseUrl}/v2/point/${lat}/${lon}/${Math.min(250, Math.max(1, radiusNm))}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`ADSB.lol request failed (${res.status})`);
    const json = await res.json();
    return (json.ac || [])
      .filter((a) => a.lat != null && a.lon != null && a.hex)
      .map((a) => this._normalizeAdsb(a));
  }

  async _fallbackFlights(opts = {}) {
    // A point query is intentionally used because ADSB.lol exposes regional
    // live endpoints (up to 250 NM), not a single worldwide snapshot.
    if (opts.bbox) {
      const { minLat, maxLat, minLon, maxLon } = opts.bbox;
      const lat = (Number(minLat) + Number(maxLat)) / 2;
      const lon = (Number(minLon) + Number(maxLon)) / 2;
      const latNm = Math.abs(Number(maxLat) - Number(minLat)) * 60;
      const lonNm = Math.abs(Number(maxLon) - Number(minLon)) * 60 * Math.cos((lat * Math.PI) / 180);
      const radius = Math.min(250, Math.max(25, Math.ceil(Math.hypot(latNm, lonNm) / 2)));
      return this._fetchAdsbPoint(lat, lon, radius);
    }

    // Default coverage for the current AboveTheClouds audience: Argentina
    // and the surrounding South Atlantic airspace.
    const centers = [
      [-34.60, -58.42], // Buenos Aires
      [-31.32, -64.21], // Córdoba
      [-32.89, -68.84], // Mendoza
    ];
    const batches = await Promise.all(centers.map(([lat, lon]) => this._fetchAdsbPoint(lat, lon, 250)));
    const seen = new Set();
    return batches.flat().filter((flight) => {
      if (seen.has(flight.icao24)) return false;
      seen.add(flight.icao24);
      return true;
    });
  }

  async getLiveFlights(opts = {}) {
    try {
      let path = '/states/all?extended=1';
      if (opts.bbox) {
        const { minLat, maxLat, minLon, maxLon } = opts.bbox;
        path += `&lamin=${minLat}&lamax=${maxLat}&lomin=${minLon}&lomax=${maxLon}`;
      }
      const json = await this._fetchOpenSky(path);
      return (json.states || [])
        .filter((s) => s[6] != null && s[5] != null)
        .map((s) => this._normalizeOpenSky(s));
    } catch (openSkyError) {
      const fallback = await this._fallbackFlights(opts);
      return fallback;
    }
  }

  async getFlightById(icao24) {
    try {
      const json = await this._fetchOpenSky(`/states/all?icao24=${encodeURIComponent(icao24.toLowerCase())}&extended=1`);
      const state = (json.states || [])[0];
      return state ? this._normalizeOpenSky(state) : null;
    } catch {
      const flights = await this._fetchAdsbPoint(-34.6, -58.42, 250);
      return flights.find((f) => f.icao24?.toLowerCase() === icao24.toLowerCase()) || null;
    }
  }

  async getFlightsNearLocation({ lat, lon, radiusKm = 300 }) {
    try {
      return await this.getLiveFlights({
        bbox: {
          minLat: lat - radiusKm / 111,
          maxLat: lat + radiusKm / 111,
          minLon: lon - radiusKm / (111 * Math.cos((lat * Math.PI) / 180)),
          maxLon: lon + radiusKm / (111 * Math.cos((lat * Math.PI) / 180)),
        },
      });
    } catch {
      return this._fetchAdsbPoint(lat, lon, Math.min(250, radiusKm / 1.852));
    }
  }

  async getAircraftDetails() {
    return null;
  }
}
