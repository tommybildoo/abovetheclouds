import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { findCountry } from '../../../server/lib/countries.js';

/**
 * GET /api/news?category=&limit=20&country=AR
 * Serves already-ingested, normalized articles (see workers/cron/news-ingest.js).
 * Never fetches feeds live on request — ingestion is a scheduled background job.
 *
 * V4's ?country= filter is intentionally pragmatic: news_articles has
 * no country column (that would require the ingestion pipeline to
 * detect country per-article, a bigger change), so this does a simple
 * case-insensitive match of the country's name against the title/
 * summary. It's a real, working "MY COUNTRY" filter, just not as
 * precise as a dedicated column would be — documented here rather than
 * silently pretending it's more sophisticated than it is.
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const country = url.searchParams.get('country');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    let rows;
    if (country) {
      const c = findCountry(country);
      const needle = `%${(c ? c.name : country)}%`;
      rows = category
        ? await d1All(env, `SELECT * FROM news_articles WHERE category = ? AND (title LIKE ? OR summary LIKE ?) ORDER BY published_at DESC LIMIT ?`, category, needle, needle, limit)
        : await d1All(env, `SELECT * FROM news_articles WHERE (title LIKE ? OR summary LIKE ?) ORDER BY published_at DESC LIMIT ?`, needle, needle, limit);
    } else if (category) {
      rows = await d1All(env, `SELECT * FROM news_articles WHERE category = ? ORDER BY published_at DESC LIMIT ?`, category, limit);
    } else {
      rows = await d1All(env, `SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?`, limit);
    }

    return jsonResponse({ articles: rows });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
