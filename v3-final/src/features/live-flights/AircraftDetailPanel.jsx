import React from 'react';
import { Link } from 'react-router-dom';

export default function AircraftDetailPanel({ flight, onClose, isLive }) {
  if (!flight) return null;
  return (
    <div className="fdp">
      <button className="fdp__close" onClick={onClose} aria-label="Close">&times;</button>
      <div className="eyebrow">{flight.callsign || flight.icao24}</div>
      <h3 className="fdp__title">{flight.aircraftType || 'Unknown Aircraft'}</h3>

      <div className="fdp__grid">
        <Field label="Aircraft Type" value={flight.aircraftType || 'Unknown'} />
        <Field label="Registration" value={flight.registration || '—'} />
        <Field label="Airline" value={flight.airline || '—'} />
        <Field label="Origin" value={flight.originIcao || '—'} />
        <Field label="Destination" value={flight.destinationIcao || '—'} />
        <Field label="Altitude" value={flight.altitudeFt != null ? `${flight.altitudeFt.toLocaleString()} ft` : '—'} />
        <Field label="Ground Speed" value={flight.groundSpeedKt != null ? `${flight.groundSpeedKt} kt` : '—'} />
        <Field label="Heading" value={flight.headingDeg != null ? `${flight.headingDeg}°` : '—'} />
        <Field label="Status" value={flight.status || '—'} />
      </div>

      {!flight.aircraftType && !flight.registration && !flight.airline && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dimmer)', marginTop: 14 }}>
          Aircraft type, registration, airline and route are not available because no metadata provider is
          configured yet — see server/lib/metadataProviders/. The position/altitude/speed above are unaffected.
        </p>
      )}

      {!isLive && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--amber)', marginTop: 10 }}>
          This is demo/synthetic data — not a real aircraft position.
        </p>
      )}

      <Link to={`/aircraft?type=${encodeURIComponent(flight.aircraftType || '')}`} className="btn btn--primary btn--sm" style={{ marginTop: 20 }}>
        Explore Aircraft
      </Link>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="fdp__field">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
