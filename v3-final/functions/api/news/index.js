import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

const fallbackArticles = [
  {
    id: 'fallback-1',
    category: 'AIRLINES',
    title: 'Aviation industry continues to expand its global network',
    summary: 'Discover the latest developments across airlines, airports and commercial aviation.',
    source: 'AboveTheClouds',
    source_url: 'https://www.icao.int/',
    published_at: Math.floor(Date.now() / 1000),
    image_url: null,
  },
  {
    id: 'fallback-2',
    category: 'AIRCRAFT',
    title: 'The latest aircraft shaping modern aviation',
    summary: 'Explore aircraft technology, operations and the aircraft flying around the world today.',
    source: 'AboveTheClouds',
    source_url: 'https://www.icao.int/',
    published_at: Math.floor(Date.now() / 1000) - 3600,
    image_url: null,
  },
  {
    id: 'fallback-3',
    category: 'ARGENTINA',
    title: 'Aviation in Argentina',
    summary: 'News and updates from the Argentine aviation community and its airports.',
    source: 'AboveTheClouds',
    source_url: 'https://www.anac.gob.ar/',
    published_at: Math.floor(Date.now() / 1000) - 7200,
    image_url: null,
  },
];

/** GET /api/news?category=&limit=20 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    const rows = category
      ? await d1All(env, `SELECT * FROM news_articles WHERE category = ? ORDER BY published_at DESC LIMIT ?`, category, limit)
      : await d1All(env, `SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?`, limit);

    if (rows.length > 0) return jsonResponse({ articles: rows });

    const fallback = category
      ? fallbackArticles.filter((article) => article.category === category)
      : fallbackArticles;

    return jsonResponse({ articles: fallback.slice(0, limit) });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
