import React from 'react';

const CATEGORIES = ['ALL', 'PASSENGER', 'CARGO', 'MILITARY', 'GENERAL_AVIATION', 'UNKNOWN'];

export default function FlightFilters({ category, setCategory, argentina, setArgentina, search, setSearch }) {
  return (
    <div className="flight-filters">
      <input
        className="flight-filters__search"
        placeholder="Search flight, registration, callsign…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="flight-filters__cats">
        {CATEGORIES.map((c) => (
          <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c === 'ALL' ? null : c)}>
            {c.replace('_', ' ')}
          </button>
        ))}
      </div>
      <button className={`flight-filters__ar${argentina ? ' active' : ''}`} onClick={() => setArgentina(!argentina)}>
        🇦🇷 ARGENTINA
      </button>
    </div>
  );
}
