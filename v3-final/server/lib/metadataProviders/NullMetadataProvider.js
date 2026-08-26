import { AircraftMetadataProvider, NULL_METADATA } from './AircraftMetadataProvider.js';

/**
 * NullMetadataProvider — the default when no metadata provider is
 * configured. Explicitly and honestly returns "unknown" for every
 * field, rather than the app silently having no metadata layer at all.
 * This makes "no metadata configured" a first-class, visible state
 * instead of an implicit gap.
 */
export class NullMetadataProvider extends AircraftMetadataProvider {
  id = 'none';

  async getAircraftMetadata(_icao24) {
    return { ...NULL_METADATA };
  }

  async getAircraftMetadataBatch(icao24s) {
    const out = {};
    for (const id of icao24s) out[id] = { ...NULL_METADATA };
    return out;
  }
}
