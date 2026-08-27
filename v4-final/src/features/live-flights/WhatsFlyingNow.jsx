import React, { useMemo, useState, useCallback } from 'react';
import FlightMap from './FlightMap.jsx';
import AircraftDetailPanel from './AircraftDetailPanel.jsx';
import FlightFilters from './FlightFilters.jsx';
import { useLiveFlights } from './useLiveFlights.js';
import { useCountry } from '../country/CountryContext.jsx';
import './whats-flying-now.css';

const MODES = [
  { key: 'global', label: 'GLOBAL' },
  { key: 'country', label: 'MY COUNTRY' },
  { key: 'near', label: 'NEAR ME' },
];

export default function WhatsFlyingNow() {
  const { country } = useCountry();
  const [mode, setMode] = useState('global');
  const [category, setCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [nearBbox, setNearBbox] = useState(null);
  const [geoError, setGeoError] = useState(null);

  const activeCountryCode = mode === 'country' && country ? country.code : null;

  const selectMode = useCallback((key) => {
    setGeoError(null);
    if (key === 'near') {
      if (!navigator.geolocation) {
        setGeoError('Geolocation is not available in this browser.');
        setMode('global');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setNearBbox({ minLat: latitude - 5, maxLat: latitude + 5, minLon: longitude - 5, maxLon: longitude + 5 });
          setMode('near');
        },
        () => {
          setGeoError('Location permission denied — showing Global instead.');
          setMode('global');
        }
      );
    } else {
      setMode(key);
    }
  }, []);

  const { flights, isLive, demoMode, updatedAt, secondsAgo, error, loading, counts } = useLiveFlights({
    category,
    country: activeCountryCode,
  });

  // "Near me" uses an explicit viewport bbox rather than the country
  // system, so it's handled as a client-side filter on top of the
  // (unscoped) global feed — acceptable since it only applies to
  // whatever's already been fetched, no extra request shape needed.
  const nearFiltered = useMemo(() => {
    if (mode !== 'near' || !nearBbox) return flights;
    return flights.filter(
      (f) => f.latitude >= nearBbox.minLat && f.latitude <= nearBbox.maxLat && f.longitude >= nearBbox.minLon && f.longitude <= nearBbox.maxLon
    );
  }, [flights, mode, nearBbox]);

  const filtered = useMemo(() => {
    const base = mode === 'near' ? nearFiltered : flights;
    if (!search.trim()) return base;
    const q = search.trim().toUpperCase();
    return base.filter(
      (f) => (f.callsign || '').toUpperCase().includes(q) || (f.registration || '').toUpperCase().includes(q) || f.icao24.toUpperCase().includes(q)
    );
  }, [flights, nearFiltered, mode, search]);

  const selectedFlight = filtered.find((f) => f.icao24 === selected) || null;

  const countryMapMode = mode === 'country' && country?.bbox ? { bbox: country.bbox } : null;

  return (
    <section id="flying-now">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">What's Above You?</div>
            <h2>What's Flying Now?</h2>
          </div>
          <p>{filtered.length} aircraft currently visible{mode === 'country' && country ? ` in ${country.name}` : ''}.</p>
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

        <div className="wfn__modes">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={mode === m.key ? 'active' : ''}
              onClick={() => selectMode(m.key)}
              disabled={m.key === 'country' && !country}
              title={m.key === 'country' && !country ? 'Select a country first' : undefined}
            >
              {m.key === 'country' && country ? `${country.flag} ${country.name.toUpperCase()}` : m.label}
            </button>
          ))}
        </div>
        {geoError && <p className="wfn__geoerror">{geoError}</p>}

        {counts && (
          <div className="wfn__counts">
            <CountPill label="Passenger" value={counts.PASSENGER} />
            <CountPill label="Cargo" value={counts.CARGO} />
            <CountPill label="Military" value={counts.MILITARY} />
            <CountPill label="General Aviation" value={counts.GENERAL_AVIATION} />
          </div>
        )}

        <FlightFilters category={category} setCategory={setCategory} search={search} setSearch={setSearch} />

        <div className="wfn__layout reveal">
          <div className="wfn__map">
            <FlightMap flights={filtered} selectedIcao24={selected} onSelect={setSelected} countryMode={countryMapMode} />
            {loading && <div className="wfn__loading">Loading flights…</div>}
          </div>

          <div className="wfn__side">
            {selectedFlight ? (
              <AircraftDetailPanel flight={selectedFlight} onClose={() => setSelected(null)} isLive={isLive} />
            ) : (
              <div className="wfn__hint">Select an aircraft, or a cluster, to see details. Zoom in on dense areas to split clusters.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CountPill({ label, value }) {
  return (
    <div className="wfn__pill">
      <b>{value ?? 0}</b>
      <span>{label}</span>
    </div>
  );
}
