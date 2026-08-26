import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const PERIODS = [
  { key: 'today', label: "Today's Top Spotters" },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'alltime', label: 'All Time' },
];

export default function Leaderboard() {
  const [period, setPeriod] = useState('today');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api(`/leaderboard?period=${period}`).then((d) => setRows(d.leaderboard)).catch(() => setRows([]));
  }, [period]);

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
