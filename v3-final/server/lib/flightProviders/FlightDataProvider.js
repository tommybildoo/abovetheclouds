/**
 * FlightDataProvider — abstract base class.
 *
 * Every real or demo flight data source implements this interface.
 * The rest of the application (API routes, frontend) never talks to
 * OpenSky, ADS-B Exchange, FlightAware, etc. directly — it only talks
 * to whatever provider is returned by getFlightProvider() in
 * server/lib/flightProviders/index.js.
 *
 * This is what makes it possible to swap providers later by changing
 * ONE environment variable (FLIGHT_DATA_PROVIDER) instead of rewriting
 * the app.
 */
export class FlightDataProvider {
  /** Unique id, e.g. 'opensky', 'demo'. Shown in API responses so the
   * frontend/UI can honestly label where data came from. */
  id = 'base';

  /** true for providers backed by a real external API, false for demo/synthetic data. */
  isLive = false;

  /**
   * @param {{ bbox?: {minLat:number,maxLat:number,minLon:number,maxLon:number} }} [opts]
   * @returns {Promise<NormalizedFlight[]>}
   */
  async getLiveFlights(_opts) {
    throw new Error('getLiveFlights() not implemented');
  }

  /**
   * @param {string} id icao24 / flight id
   * @returns {Promise<NormalizedFlight|null>}
   */
  async getFlightById(_id) {
    throw new Error('getFlightById() not implemented');
  }

  /**
   * @param {{lat:number, lon:number, radiusKm:number}} location
   * @returns {Promise<NormalizedFlight[]>}
   */
  async getFlightsNearLocation(_location) {
    throw new Error('getFlightsNearLocation() not implemented');
  }

  /**
   * @param {string} registrationOrType
   * @returns {Promise<object|null>}
   */
  async getAircraftDetails(_registrationOrType) {
    throw new Error('getAircraftDetails() not implemented');
  }
}

/**
 * @typedef {Object} NormalizedFlight
 * @property {string} icao24            unique transponder/aircraft id
 * @property {string|null} callsign
 * @property {string|null} registration
 * @property {string|null} aircraftType
 * @property {string|null} airline
 * @property {string|null} originIcao
 * @property {string|null} destinationIcao
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {number|null} altitudeFt
 * @property {number|null} groundSpeedKt
 * @property {number|null} headingDeg
 * @property {'PASSENGER'|'CARGO'|'MILITARY'|'GENERAL_AVIATION'|'UNKNOWN'} category
 * @property {'IN_FLIGHT'|'LANDED'|'SCHEDULED'} status
 * @property {string} provider          provider id, e.g. 'opensky' | 'demo'
 * @property {number} updatedAt         unix seconds
 */
