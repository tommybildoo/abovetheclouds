import React, { useState } from 'react';

/**
 * /admin — minimal dashboard, protected by an admin token header.
 * See functions/api/admin/dashboard.js. Replace with real role-based
 * auth before going to production with real users.
 */
export default function Admin() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard', { headers: { 'X-Admin-Token': token } });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 120, paddingBottom: 100 }}>
      <div className="eyebrow">Admin</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, textTransform: 'uppercase', margin: '10px 0 30px' }}>Dashboard</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 30, maxWidth: 480 }}>
        <input placeholder="Admin token" value={token} onChange={(e) => setToken(e.target.value)}
          style={{ flex: 1, padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--line-strong)', color: 'var(--text)' }} />
        <button className="btn btn--primary" onClick={load}>Load</button>
      </div>

      {error && <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{error}</p>}

      {data && (
        <div className="ae__specgrid" style={{ maxWidth: 900 }}>
          {Object.entries(data).map(([k, v]) => (
            <div className="ae__specfield" key={k}>
              <span>{k}</span>
              <b>{String(v)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
