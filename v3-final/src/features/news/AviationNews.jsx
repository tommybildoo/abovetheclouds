import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';

function timeAgo(unixSeconds) {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return 'JUST NOW';
  if (diff < 3600) return `${Math.floor(diff / 60)} MIN AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} HOURS AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

export default function AviationNews() {
  const [articles, setArticles] = useState(null);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    const params = category ? `?category=${category}` : '';
    api(`/news${params}`).then((d) => setArticles(d.articles)).catch(() => setArticles([]));
  }, [category]);

  const cats = ['LATEST', 'ARGENTINA', 'AIRCRAFT', 'AIRLINES'];

  return (
    <section>
      <div className="container">
        <div className="section-head reveal">
          <div>
            <div className="eyebrow">Today Above The Clouds</div>
            <h2>Aviation Now</h2>
          </div>
          <p>Automatically ingested from RSS and structured aviation sources — always linking back to the original.</p>
        </div>

        <div className="news__tabs reveal">
          {cats.map((c) => (
            <button key={c} className={category === (c === 'LATEST' ? null : c) ? 'active' : ''} onClick={() => setCategory(c === 'LATEST' ? null : c)}>{c}</button>
          ))}
        </div>

        <div className="news__grid reveal">
          {articles === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading news…</p>}
          {articles && articles.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>
              No articles yet — the news ingestion job hasn't run, or no sources are configured. See workers/cron/news-ingest.js.
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
