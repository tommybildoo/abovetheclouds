import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useCountry } from '../country/CountryContext.jsx';

const PERIODS = [
  { key: 'today', label: "Today's Top Spotters" },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All Time' },
];

// V4 adds a GLOBAL / MY COUNTRY / FRIENDS scope alongside the existing
// time-period tabs. FRIENDS is intentionally disabled — there is no
// friends/social-graph feature in the schema yet (no friends table),
// so rather than fake a "friends leaderboard" with global data, it's
// shown but disabled with an honest tooltip.
const SCOPES = [
  { key: 'global', label: 'GLOBAL' },
  { key: 'country', label: 'MY COUNTRY' },
  { key: 'friends', label: 'FRIENDS' },
];

export default function Leaderboard() {
  const { country } = useCountry();
  const [period, setPeriod] = useState('today');
  const [scope, setScope] = useState('global');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ period });
    if (scope === 'country' && country) params.set('country', country.code);
    api(`/leaderboard?${params.toString()}`).then((d) => setRows(d.leaderboard)).catch(() => setRows([]));
  }, [period, scope, country]);

  return (
    <section id="leaderboard">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">Compete</div>
            <h2>{PERIODS.find((p) => p.key === period)?.label}</h2>
          </div>
          <div className="lb__tabs">
            {PERIODS.map((p) => <button key={p.key} className={period===p.key?'active':''} onClick={()=>setPeriod(p.key)}>{p.key.toUpperCase()}</button>)}
          </div>
        </div>

        <div className="lb__scopes">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              className={scope === s.key ? 'active' : ''}
              onClick={() => s.key !== 'friends' && setScope(s.key)}
              disabled={s.key === 'friends' || (s.key === 'country' && !country)}
              title={s.key === 'friends' ? 'Friends leaderboard is not built yet — no friends system exists' : s.key === 'country' && !country ? 'Select a country first' : undefined}
            >
              {s.key === 'country' && country ? `${country.flag} ${s.label}` : s.label}
            </button>
          ))}
        </div>

        <div className="lb__table reveal">
          {rows === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading leaderboard…</p>}
          {rows && rows.length === 0 && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>No XP earned in this period yet.</p>}
          {rows && rows.map((r) => (
            <div className="lb__row" key={r.rank}>
              <span className="lb__rank">#{r.rank}</span>
              <span className="lb__name">{r.username}</span>
              <span className="lb__xp">{r.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
