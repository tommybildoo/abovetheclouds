import { parseRssFeed } from '../../server/lib/news/rssParser.js';
import { categorize, hashKey } from '../../server/lib/news/categorize.js';
import { d1All, d1Run, nowSeconds } from '../../server/lib/db.js';

/**
 * Scheduled worker — news ingestion.
 * Configure the cron trigger in wrangler.toml, e.g. every 20 minutes:
 *   [triggers]
 *   crons = ["*\/20 * * * *"]
 *
 * Steps (per the spec):
 *  1. Fetch enabled sources (news_sources where enabled = 1)
 *  2. Parse RSS/API results
 *  3. Normalize article data
 *  4. Detect duplicates (guid, or hash of title+url as fallback)
 *  5. Store new articles
 *  6. Categorize articles
 *  7. Publish automatically (INSERT — no manual approval needed for news)
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ingestAllSources(env));
  },
  // Also exported so it can be triggered manually for local testing / an
  // admin "re-run ingestion" button.
  async fetch(_request, env) {
    const result = await ingestAllSources(env);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  },
};

export async function ingestAllSources(env) {
  const sources = await d1All(env, `SELECT * FROM news_sources WHERE enabled = 1`);
  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const source of sources) {
    try {
      if (source.type !== 'rss') continue; // API-type sources: add a dedicated fetcher per provider

      const res = await fetch(source.url, { headers: { 'User-Agent': 'AboveTheCloudsBot/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items = parseRssFeed(xml, source.name);

      for (const item of items) {
        const guid = item.guid || (await hashKey(item.title + item.sourceUrl));
        const existing = await d1All(env, `SELECT id FROM news_articles WHERE guid = ?`, guid);
        if (existing.length > 0) {
          skipped++;
          continue;
        }
        const category = source.category && source.category !== 'AUTO' ? source.category : categorize(item.title, item.summary);
        await d1Run(
          env,
          `INSERT OR IGNORE INTO news_articles (title, source, source_url, published_at, image_url, summary, category, guid, created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          item.title, item.source, item.sourceUrl, item.publishedAt, item.imageUrl, item.summary, category, guid, nowSeconds()
        );
        inserted++;
      }
    } catch (err) {
      errors.push({ source: source.name, error: err.message });
    }
  }

  // Cleanup: keep the articles table from growing forever.
  await d1Run(env, `DELETE FROM news_articles WHERE published_at < strftime('%s','now','-90 days')`);

  return { inserted, skipped, sourcesProcessed: sources.length, errors };
}
