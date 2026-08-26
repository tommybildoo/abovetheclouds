import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';

export default function ArgentinaSection() {
  const [airports, setAirports] = useState(null);
  useEffect(() => {
    api('/airports?argentina=1').then((d) => setAirports(d.airports)).catch(() => setAirports([]));
  }, []);

  return (
    <section id="argentina">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">From Argentina To The World</div>
            <h2>Argentina From Above</h2>
          </div>
          <p>Aeroparque, Ezeiza, Córdoba, Ushuaia and more — one of AboveTheClouds' strongest identities.</p>
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
