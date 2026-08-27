import React, { useState, useMemo } from 'react';
import { COUNTRIES, POPULAR_CODES } from './countries.js';
import { useCountry } from './CountryContext.jsx';

export default function CountrySelector({ onClose, dismissible = false }) {
  const { setCountryCode } = useCountry();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return COUNTRIES.filter((c) => POPULAR_CODES.includes(c.code));
    const q = query.trim().toLowerCase();
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [query]);

  const choose = (code) => {
    setCountryCode(code);
    onClose?.();
  };

  return (
    <div className="country-modal-overlay" onClick={() => dismissible && onClose?.()}>
      <div className="country-modal" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Your Aviation World, Personalized</div>
        <h2 className="country-modal__title">Where are you flying from?</h2>
        <p className="country-modal__sub">We'll personalize live flights, airports, news and your daily quiz for this country.</p>

        <input
          className="country-modal__search"
          placeholder="Search a country…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {!query.trim() && <div className="country-modal__label">Popular</div>}

        <div className="country-modal__grid">
          {results.map((c) => (
            <button key={c.code} className="country-modal__item" onClick={() => choose(c.code)}>
              <span className="country-modal__flag">{c.flag}</span>
              <span>{c.name}</span>
            </button>
          ))}
          {results.length === 0 && <p className="country-modal__empty">No matching country — try a different search.</p>}
        </div>

        {dismissible && (
          <button className="country-modal__skip" onClick={() => onClose?.()}>Skip for now — use Global</button>
        )}
      </div>
    </div>
  );
}
