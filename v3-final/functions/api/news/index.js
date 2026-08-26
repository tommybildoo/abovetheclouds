import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/news?category=&limit=20
 * Serves already-ingested, normalized articles (see workers/cron/news-ingest.js).
 * Never fetches feeds live on request — ingestion is a scheduled background job.
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    const rows = category
      ? await d1All(env, `SELECT * FROM news_articles WHERE category = ? ORDER BY published_at DESC LIMIT ?`, category, limit)
      : await d1All(env, `SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?`, limit);

    return jsonResponse({ articles: rows });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
