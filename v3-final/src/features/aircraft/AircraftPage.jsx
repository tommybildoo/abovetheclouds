import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';

export default function AircraftPage() {
  const { slug } = useParams();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    setData(undefined);
    api(`/aircraft/${slug}`).then(setData).catch(() => setData(null));
  }, [slug]);

  if (data === undefined) return <div className="container" style={{ padding: '140px 0' }}>Loading…</div>;
  if (data === null) return <div className="container" style={{ padding: '140px 0' }}>Aircraft not found.</div>;

  const a = data.aircraft;
  return (
    <div>
      <div className="container" style={{ paddingTop: 120 }}>
        <div className="eyebrow">{a.manufacturer}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,6vw,72px)', textTransform: 'uppercase', margin: '10px 0 24px' }}>{a.model}</h1>
        <SafeImage src={a.hero_image} alt={a.model} kind="aircraft" style={{ width: '100%', maxHeight: 480, objectFit: 'cover', marginBottom: 32 }} />
        {a.why_fans_love_it && <p style={{ maxWidth: 620, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 40, fontWeight: 300 }}>{a.why_fans_love_it}</p>}

        <div className="ae__specgrid">
          <Spec label="First Flight" value={a.first_flight} />
          <Spec label="Length" value={a.length_m ? `${a.length_m} m` : null} />
          <Spec label="Wingspan" value={a.wingspan_m ? `${a.wingspan_m} m` : null} />
          <Spec label="Height" value={a.height_m ? `${a.height_m} m` : null} />
          <Spec label="Cruise Speed" value={a.cruise_speed} />
          <Spec label="Range" value={a.range_km ? `${a.range_km.toLocaleString()} km` : null} />
          <Spec label="Typical Capacity" value={a.typical_capacity ? `${a.typical_capacity} PAX` : null} />
          <Spec label="Engines" value={a.engines} />
          <Spec label="MTOW" value={a.mtow_kg ? `${a.mtow_kg.toLocaleString()} kg` : null} />
        </div>

        <Link to={`/#flying-now`} className="btn btn--primary" style={{ margin: '40px 0 100px' }}>Track This Aircraft</Link>
      </div>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div className="ae__specfield">
      <span>{label}</span>
      <b>{value || '—'}</b>
    </div>
  );
}
