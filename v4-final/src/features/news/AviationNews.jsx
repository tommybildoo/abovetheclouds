import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';
import { useCountry } from '../country/CountryContext.jsx';

function timeAgo(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'JUST NOW';
  if (diff < 3600) return `${Math.floor(diff / 60)} MIN AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} HOURS AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

// V4: 'MY COUNTRY' and 'GLOBAL' are pseudo-tabs handled client-side
// (country filter vs. no filter); the rest map directly to
// news_articles.category values already ingested by the news pipeline.
const TABS = [
  { key: 'GLOBAL', label: 'GLOBAL' },
  { key: 'MY_COUNTRY', label: 'MY COUNTRY' },
  { key: 'AIRLINES', label: 'AIRLINES' },
  { key: 'AIRCRAFT', label: 'AIRCRAFT' },
  { key: 'AIRPORTS', label: 'AIRPORTS' },
  { key: 'MILITARY', label: 'MILITARY' },
  { key: 'GENERAL_AVIATION', label: 'GENERAL AVIATION' },
];

export default function AviationNews() {
  const { country } = useCountry();
  const [articles, setArticles] = useState(null);
  const [tab, setTab] = useState('GLOBAL');

  useEffect(() => {
    const params = new URLSearchParams();
    if (tab === 'MY_COUNTRY') {
      if (country) params.set('country', country.code);
    } else if (tab !== 'GLOBAL') {
      params.set('category', tab);
    }
    api(`/news?${params.toString()}`).then((d) => setArticles(d.articles)).catch(() => setArticles([]));
  }, [tab, country]);

  return (
    <section id="news">
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">Today Above The Clouds</div>
            <h2>Aviation Now</h2>
          </div>
          <p>Automatically ingested from RSS and structured aviation sources — always linking back to the original.</p>
        </div>

        <div className="news__tabs reveal">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? 'active' : ''}
              onClick={() => setTab(t.key)}
              disabled={t.key === 'MY_COUNTRY' && !country}
              title={t.key === 'MY_COUNTRY' && !country ? 'Select a country first' : undefined}
            >
              {t.key === 'MY_COUNTRY' && country ? `${country.flag} ${t.label}` : t.label}
            </button>
          ))}
        </div>

        <div className="news__grid reveal">
          {articles === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading news…</p>}
          {articles && articles.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>
              No articles found for this filter yet — the news ingestion job hasn't run, no sources are configured, or
              no ingested article mentions this country by name (see functions/api/news/index.js for how MY COUNTRY
              filtering works). See workers/cron/news-ingest.js.
            </p>
          )}
          {articles && articles.map((a) => (
            <a key={a.id} href={a.source_url} target="_blank" rel="noopener noreferrer" className="news__card">
              {a.image_url && <SafeImage src={a.image_url} alt={a.title} kind="photo" />}
              <div className="news__body">
                <span className="news__cat">{a.category}</span>
                <h4>{a.title}</h4>
                <p>{a.summary}</p>
                <div className="news__meta"><span>{a.source}</span><span>{timeAgo(a.published_at)}</span></div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
