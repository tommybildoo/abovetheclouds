import { d1All, d1Run, jsonResponse, errorResponse, nowSeconds } from '../../../server/lib/db.js';
import { parseRssFeed } from '../../../server/lib/news/rssParser.js';
import { categorize, hashKey } from '../../../server/lib/news/categorize.js';

const LIVE_SOURCES = [
  { name: 'Simple Flying', url: 'https://simpleflying.com/feed/', category: 'AUTO' },
  { name: 'The Aviationist', url: 'https://theaviationist.com/feed/', category: 'AUTO' },
  { name: 'FLYING', url: 'https://www.flyingmag.com/feed/', category: 'AUTO' },
  { name: 'AirlineGeeks', url: 'https://airlinegeeks.com/feed/', category: 'AIRLINES' },
];

async function refreshLiveNews(env) {
  let inserted = 0;
  const errors = [];

  for (const source of LIVE_SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: {
          'User-Agent': 'AboveTheClouds/3.0 (+https://abovetheclouds.arg)',
          Accept: 'application/rss+xml, application/atom+xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const xml = await res.text();
      const items = parseRssFeed(xml, source.name, source.url).slice(0, 8);

      for (const item of items) {
        const guid = item.guid || (await hashKey(item.title + item.sourceUrl));
        const existing = await d1All(env, `SELECT id FROM news_articles WHERE guid = ?`, guid);
        if (existing.length) continue;

        const category = source.category === 'AUTO'
          ? categorize(item.title, item.summary)
          : source.category;

        await d1Run(
          env,
          `INSERT OR IGNORE INTO news_articles
            (title, source, source_url, published_at, image_url, summary, category, guid, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          item.title,
          item.source,
          item.sourceUrl,
          item.publishedAt,
          item.imageUrl,
          item.summary,
          category,
          guid,
          nowSeconds()
        );
        inserted++;
      }
    } catch (err) {
      errors.push({ source: source.name, error: err.message });
    }
  }

  return { inserted, errors };
}

/**
 * GET /api/news?category=&limit=20
 * Cached news is refreshed automatically when empty or older than 20 minutes.
 * This means Aviation Now works without a manual worker run.
 */
export async function onRequestGet({ request, env, waitUntil }) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    let rows = category
      ? await d1All(env, `SELECT * FROM news_articles WHERE category = ? ORDER BY published_at DESC LIMIT ?`, category, limit)
      : await d1All(env, `SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?`, limit);

    const latest = rows[0]?.published_at || 0;
    const stale = !latest || latest < Math.floor(Date.now() / 1000) - 20 * 60;

    if (stale) {
      if (!rows.length) {
        await refreshLiveNews(env);
        rows = category
          ? await d1All(env, `SELECT * FROM news_articles WHERE category = ? ORDER BY published_at DESC LIMIT ?`, category, limit)
          : await d1All(env, `SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?`, limit);
      } else if (waitUntil) {
        waitUntil(refreshLiveNews(env));
      }
    }

    return jsonResponse({ articles: rows, refreshed: stale });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
