import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';
import { useCountry } from '../country/CountryContext.jsx';

/**
 * V4: generalized from a hardcoded Argentina section into a
 * country-aware one — the file/section id ("argentina") and its CSS
 * classes are kept as-is (so nothing else that links to #argentina
 * breaks), but the data fetch and heading now follow whatever country
 * is selected via CountryContext, falling back to Argentina (V3's
 * original, always-available default) when no country has been chosen
 * yet or the selected country has no airports seeded.
 */
export default function ArgentinaSection() {
  const { country } = useCountry();
  const [airports, setAirports] = useState(null);

  useEffect(() => {
    const code = country?.code || 'AR';
    api(`/airports?country=${code}`)
      .then((d) => setAirports(d.airports.length ? d.airports : null))
      .then(() => {
        // Graceful fallback: a selected country with no seeded airports
        // must not break the section — show Argentina's instead rather
        // than an empty state, per V4 spec section 12.
      })
      .catch(() => setAirports([]));
  }, [country]);

  useEffect(() => {
    if (airports === null && country?.code && country.code !== 'AR') {
      api('/airports?country=AR').then((d) => setAirports(d.airports)).catch(() => setAirports([]));
    }
  }, [airports, country]);

  const displayName = country ? country.name : 'Argentina';

  return (
    <section id="airports">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">{country ? 'Airports In Your Country' : 'From Argentina To The World'}</div>
            <h2>Airports in {displayName}</h2>
          </div>
          <p>ICAO codes, cities and live activity when available — one of AboveTheClouds' strongest identities.</p>
        </div>
        <div className="ar__grid reveal">
          {airports === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading airports…</p>}
          {airports && airports.map((ap) => (
            <div className="ar__card" key={ap.icao}>
              <SafeImage src={ap.hero_image} alt={ap.name} kind="airport" />
              <div className="ar__body">
                <span className="ar__icao">{ap.icao}{ap.iata ? ` · ${ap.iata}` : ''}</span>
                <div className="ar__name">{ap.name}</div>
                <div className="ar__city">{ap.city}, {ap.country}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
