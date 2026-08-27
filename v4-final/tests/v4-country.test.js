import { describe, it, expect } from 'vitest';
import { getCountryBbox, ARGENTINA_BBOX, isWithinBbox } from '../server/lib/geo.js';
import { findCountry, COUNTRIES } from '../server/lib/countries.js';

describe('V4 country/geo (personalization)', () => {
  it('resolves a bbox for a curated country code', () => {
    expect(getCountryBbox('AR')).not.toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getCountryBbox('ar')).not.toBeNull();
  });

  it('returns null (not an error) for an unknown country — must never break the app', () => {
    expect(getCountryBbox('ZZ')).toBeNull();
    expect(getCountryBbox(undefined)).toBeNull();
  });

  it('keeps ARGENTINA_BBOX unchanged for backward compatibility with legacy ?argentina=1 callers', () => {
    expect(ARGENTINA_BBOX.minLat).toBe(-56);
    expect(ARGENTINA_BBOX.maxLat).toBe(-21);
    expect(ARGENTINA_BBOX.minLon).toBe(-74);
    expect(ARGENTINA_BBOX.maxLon).toBe(-53);
  });

  it('isWithinBbox correctly classifies a point inside vs outside', () => {
    expect(isWithinBbox(-34.6, -58.4, ARGENTINA_BBOX)).toBe(true); // Buenos Aires
    expect(isWithinBbox(40.7, -74.0, ARGENTINA_BBOX)).toBe(false); // New York
  });

  it('findCountry resolves known codes and rejects unknown ones', () => {
    expect(findCountry('US').name).toBe('United States');
    expect(findCountry('zz')).toBeNull();
    expect(findCountry(null)).toBeNull();
  });

  it('keeps the curated list intentionally small (not a giant unordered list, per spec)', () => {
    expect(COUNTRIES.length).toBeLessThanOrEqual(20);
  });
});
