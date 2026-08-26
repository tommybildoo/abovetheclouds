import React, { useMemo, useState } from 'react';
import FlightMap from './FlightMap.jsx';
import AircraftDetailPanel from './AircraftDetailPanel.jsx';
import FlightFilters from './FlightFilters.jsx';
import { useLiveFlights } from './useLiveFlights.js';
import './whats-flying-now.css';

export default function WhatsFlyingNow() {
  const [category, setCategory] = useState(null);
  const [argentina, setArgentina] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { flights, isLive, demoMode, updatedAt, secondsAgo, error, loading } = useLiveFlights({ category, argentina });

  const filtered = useMemo(() => {
    if (!search.trim()) return flights;
    const q = search.trim().toUpperCase();
    return flights.filter(
      (f) => (f.callsign || '').toUpperCase().includes(q) || (f.registration || '').toUpperCase().includes(q) || f.icao24.toUpperCase().includes(q)
    );
  }, [flights, search]);

  const selectedFlight = filtered.find((f) => f.icao24 === selected) || null;

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const altitudes = filtered.map((f) => f.altitudeFt).filter((v) => v != null);
    const speeds = filtered.map((f) => f.groundSpeedKt).filter((v) => v != null);
    const arCount = filtered.filter((f) => f.latitude <= -21 && f.latitude >= -56 && f.longitude <= -53 && f.longitude >= -74).length;
    return {
      inView: filtered.length,
      aboveArgentina: arCount,
      altitudeRecord: altitudes.length ? Math.max(...altitudes) : null,
      fastest: speeds.length ? Math.max(...speeds) : null,
    };
  }, [filtered]);

  return (
    <section id="flying-now">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">What's Above You?</div>
            <h2>What's Flying Now?</h2>
          </div>
          <p>See what's moving above the world right now.</p>
        </div>

        <div className="wfn__statusbar">
          {demoMode ? (
            <span className="badge badge--demo">DEMO MODE — CONNECT A LIVE FLIGHT DATA PROVIDER</span>
          ) : error ? (
            <span className="badge badge--error">LIVE DATA TEMPORARILY UNAVAILABLE</span>
          ) : (
            <span className="badge badge--live"><span className="dot"></span>LIVE</span>
          )}
          {!error && updatedAt && <span className="wfn__updated">Updated {secondsAgo}s ago</span>}
        </div>

        <FlightFilters category={category} setCategory={setCategory} argentina={argentina} setArgentina={setArgentina} search={search} setSearch={setSearch} />

        <div className="wfn__layout reveal">
          <div className="wfn__map">
            <FlightMap flights={filtered} selectedIcao24={selected} onSelect={setSelected} argentinaMode={argentina} />
            {loading && <div className="wfn__loading">Loading flights…</div>}
          </div>

          <div className="wfn__side">
            {stats && (
              <div className="wfn__stats">
                <Stat label="Aircraft In View" value={stats.inView} />
                <Stat label="Above Argentina" value={stats.aboveArgentina} />
                <Stat label="Altitude Record" value={stats.altitudeRecord ? `${stats.altitudeRecord.toLocaleString()} ft` : '—'} />
                <Stat label="Fastest Aircraft" value={stats.fastest ? `${stats.fastest} kt` : '—'} />
              </div>
            )}
            {selectedFlight ? (
              <AircraftDetailPanel flight={selectedFlight} onClose={() => setSelected(null)} isLive={isLive} />
            ) : (
              <div className="wfn__hint">Select an aircraft marker to see its details.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="wfn__stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
