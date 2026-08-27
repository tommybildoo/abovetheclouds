import React from 'react';

const CATEGORIES = ['ALL', 'PASSENGER', 'CARGO', 'MILITARY', 'GENERAL_AVIATION', 'UNKNOWN'];

/**
 * V4: the old hardcoded "🇦🇷 ARGENTINA" toggle was replaced by the
 * generalized GLOBAL / MY COUNTRY / NEAR ME mode selector in
 * WhatsFlyingNow.jsx (works for any curated country, not just
 * Argentina) — this component now only handles category + search,
 * which stayed unchanged from V3.
 */
export default function FlightFilters({ category, setCategory, search, setSearch }) {
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
    </div>
  );
}
