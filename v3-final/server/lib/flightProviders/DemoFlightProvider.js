import { FlightDataProvider } from './FlightDataProvider.js';

/**
 * DemoFlightProvider
 *
 * Used automatically when no live flight API is configured
 * (i.e. FLIGHT_DATA_PROVIDER is unset or 'demo').
 *
 * IMPORTANT — DATA HONESTY:
 * This provider generates a small set of clearly-synthetic aircraft that
 * drift smoothly across the map so the UI has something to render and is
 * pleasant to demo. Every object it returns has `provider: 'demo'` and
 * `isLive: false`. The frontend is REQUIRED to check this flag and show
 * a "DEMO MODE" banner — it must never present this data as real traffic.
 * See src/features/live-flights/WhatsFlyingNow.jsx.
 */
export class DemoFlightProvider extends FlightDataProvider {
  id = 'demo';
  isLive = false;

  constructor() {
    super();
    this._seed = [
      { icao24: 'DEMO01', callsign: 'ATC101', registration: 'LV-DEMO', aircraftType: 'Boeing 737-800', airline: 'Demo Airlines', originIcao: 'SAEZ', destinationIcao: 'SABE', lat: -34.6, lon: -58.5, alt: 34000, gs: 440, hdg: 90, category: 'PASSENGER' },
      { icao24: 'DEMO02', callsign: 'ATC202', registration: 'LV-SIML', aircraftType: 'Airbus A320', originIcao: 'SACO', destinationIcao: 'SAEZ', airline: 'Demo Airlines', lat: -31.3, lon: -64.2, alt: 28000, gs: 410, hdg: 145, category: 'PASSENGER' },
      { icao24: 'DEMO03', callsign: 'CARGO9', registration: 'N-DEMO3', aircraftType: 'Boeing 767-300F', originIcao: 'KMIA', destinationIcao: 'SAEZ', airline: 'Demo Cargo', lat: -20.1, lon: -55.0, alt: 37000, gs: 470, hdg: 200, category: 'CARGO' },
      { icao24: 'DEMO04', callsign: 'AF447D', registration: 'F-DEMO4', aircraftType: 'Airbus A350-900', originIcao: 'LFPG', destinationIcao: 'SAEZ', airline: 'Demo Global', lat: -10.0, lon: -35.0, alt: 39000, gs: 490, hdg: 220, category: 'PASSENGER' },
      { icao24: 'DEMO05', callsign: 'MIL01', registration: 'AE-501', aircraftType: 'C-130 Hercules', originIcao: 'SAWH', destinationIcao: 'SAEZ', airline: 'Fuerza Aérea (demo)', lat: -50.0, lon: -68.3, alt: 22000, gs: 290, hdg: 10, category: 'MILITARY' },
      { icao24: 'DEMO06', callsign: null, registration: 'LV-GA6', aircraftType: 'Cessna 172', originIcao: 'SADF', destinationIcao: 'SADF', airline: null, lat: -34.45, lon: -58.58, alt: 3500, gs: 110, hdg: 300, category: 'GENERAL_AVIATION' },
    ];
  }

  _drift(seedItem, tSeconds) {
    // Gentle synthetic movement so the demo map doesn't look frozen.
    const driftLat = Math.sin((tSeconds + seedItem.icao24.length) / 40) * 0.6;
    const driftLon = Math.cos((tSeconds + seedItem.icao24.length) / 55) * 0.6;
    return {
      icao24: seedItem.icao24,
      callsign: seedItem.callsign,
      registration: seedItem.registration,
      aircraftType: seedItem.aircraftType,
      airline: seedItem.airline,
      originIcao: seedItem.originIcao,
      destinationIcao: seedItem.destinationIcao,
      latitude: +(seedItem.lat + driftLat).toFixed(4),
      longitude: +(seedItem.lon + driftLon).toFixed(4),
      altitudeFt: seedItem.alt,
      groundSpeedKt: seedItem.gs,
      headingDeg: seedItem.hdg,
      category: seedItem.category,
      status: 'IN_FLIGHT',
      provider: 'demo',
      updatedAt: Math.floor(Date.now() / 1000),
    };
  }

  async getLiveFlights(_opts) {
    const t = Math.floor(Date.now() / 1000);
    return this._seed.map((s) => this._drift(s, t));
  }

  async getFlightById(id) {
    const t = Math.floor(Date.now() / 1000);
    const seedItem = this._seed.find((s) => s.icao24 === id);
    return seedItem ? this._drift(seedItem, t) : null;
  }

  async getFlightsNearLocation({ lat, lon, radiusKm = 500 }) {
    const all = await this.getLiveFlights();
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    return all.filter((f) => {
      const dLat = toRad(f.latitude - lat);
      const dLon = toRad(f.longitude - lon);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(f.latitude)) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return dist <= radiusKm;
    });
  }

  async getAircraftDetails(registrationOrType) {
    const match = this._seed.find(
      (s) => s.registration === registrationOrType || s.aircraftType === registrationOrType
    );
    return match ? { registration: match.registration, aircraftType: match.aircraftType, note: 'Demo aircraft — not a real registration.' } : null;
  }
}
