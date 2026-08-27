import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import SafeImage from '../../components/SafeImage.jsx';

function timeAgo(unixSeconds) {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - Number(unixSeconds || 0));
  if (diff < 60) return 'JUST NOW';
  if (diff < 3600) return `${Math.floor(diff / 60)} MIN AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} HOURS AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

function sourceLabel(url, source) {
  if (source) return source;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'SOURCE';
  }
}

export default function AviationNews() {
  const [articles, setArticles] = useState(null);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const params = category ? `?category=${encodeURIComponent(category)}` : '';

    setArticles(null);
    api(`/news${params}`)
      .then((data) => {
        if (!cancelled) setArticles(Array.isArray(data.articles) ? data.articles : []);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      });

    return () => {
      cancelled = true;
    };
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
          <p>Latest aviation developments, with every card linking directly to the original story.</p>
        </div>

        <div className="news__tabs reveal">
          {cats.map((c) => (
            <button key={c} className={category === (c === 'LATEST' ? null : c) ? 'active' : ''} onClick={() => setCategory(c === 'LATEST' ? null : c)}>{c}</button>
          ))}
        </div>

        <div className="news__grid reveal">
          {articles === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>Loading live aviation news…</p>}
          {articles?.length === 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dimmer)' }}>
              No live stories are available right now. Refresh in a moment.
            </p>
          )}
          {articles?.map((a) => (
            <a
              key={a.id || a.guid || a.source_url}
              href={a.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="news__card"
              aria-label={`Read full story: ${a.title}`}
            >
              <SafeImage src={a.image_url} alt={a.title} kind="photo" />
              <div className="news__body">
                <span className="news__cat">{a.category}</span>
                <h4>{a.title}</h4>
                <p>{a.summary || 'Open the original article for the full story.'}</p>
                <div className="news__meta">
                  <span>{sourceLabel(a.source_url, a.source)}</span>
                  <span>{timeAgo(a.published_at)}</span>
                </div>
                <div className="news__read">READ STORY ↗</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
