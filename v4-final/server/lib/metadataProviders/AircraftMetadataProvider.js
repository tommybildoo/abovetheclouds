/**
 * AircraftMetadataProvider — abstract base class.
 *
 * WHY THIS EXISTS:
 * OpenSky's /states/all endpoint gives real-time POSITION data (lat/lon,
 * altitude, speed, heading, callsign) but does NOT reliably give
 * aircraft TYPE, REGISTRATION, AIRLINE, ORIGIN, or DESTINATION. Those
 * are a separate concern — "aircraft metadata" / "flight schedule data"
 * — usually from a different (often paid) data source.
 *
 * Mixing these two concerns in one provider tempts you into guessing or
 * fabricating metadata to "fill in the blanks". This class exists so
 * that never happens: live position data and metadata enrichment are
 * two independent, explicitly-optional pipelines that compose cleanly.
 *
 * A metadata provider is OPTIONAL. When none is configured (the default),
 * every enrichable field is returned as null and the UI is REQUIRED to
 * render that honestly — see NULL_METADATA below and
 * src/features/live-flights/AircraftDetailPanel.jsx, which shows
 * "Unknown" / "—" rather than inventing a value.
 */
export class AircraftMetadataProvider {
  id = 'base';

  /**
   * @param {string} icao24
   * @returns {Promise<AircraftMetadata|null>}
   */
  async getAircraftMetadata(_icao24) {
    throw new Error('getAircraftMetadata() not implemented');
  }

  /**
   * Batch variant — implementations SHOULD override this with a real
   * bulk request where the provider supports it, instead of the default
   * N sequential calls, to avoid hammering the provider per-marker.
   * @param {string[]} icao24s
   * @returns {Promise<Record<string, AircraftMetadata>>} keyed by icao24
   */
  async getAircraftMetadataBatch(icao24s) {
    const out = {};
    for (const id of icao24s) {
      out[id] = await this.getAircraftMetadata(id);
    }
    return out;
  }
}

/**
 * @typedef {Object} AircraftMetadata
 * @property {string|null} aircraftType
 * @property {string|null} registration
 * @property {string|null} airline
 * @property {string|null} originIcao
 * @property {string|null} destinationIcao
 */

/** The explicit "nothing known" value — never replace this with a guess. */
export const NULL_METADATA = Object.freeze({
  aircraftType: null,
  registration: null,
  airline: null,
  originIcao: null,
  destinationIcao: null,
});
