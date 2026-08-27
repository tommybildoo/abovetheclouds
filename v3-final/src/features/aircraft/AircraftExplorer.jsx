import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';

export default function AircraftExplorer() {
  const [aircraft, setAircraft] = useState(null);

  useEffect(() => {
    api('/aircraft').then((d) => setAircraft(d.aircraft)).catch(() => setAircraft([]));
  }, []);

  return (
    <section>
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">Discover Your Next Aircraft</div>
            <h2>Explore Aircraft</h2>
          </div>
          <p>16 aircraft and growing — every spec, every story, every reason fans love them.</p>
        </div>

        <div className="ae__grid reveal">
          {aircraft === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading fleet…</p>}
          {aircraft && aircraft.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>
              No aircraft seeded yet. Run the seed script in database/ or add rows to the `aircraft` table.
            </p>
          )}
          {aircraft && aircraft.map((a) => (
            <Link key={a.slug} to={`/aircraft/${a.slug}`} className="ae__card">
              <SafeImage
                src={a.hero_image || a.image_url || a.image}
                alt={`${a.manufacturer} ${a.model}`}
                kind="aircraft"
                className="ae__image"
              />
              <span className="ae__manu">{a.manufacturer}</span>
              <div className="ae__name">{a.model}</div>
              <div className="ae__spec">
                <span>{a.family}</span>
                <span>{a.cruise_speed || '—'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
