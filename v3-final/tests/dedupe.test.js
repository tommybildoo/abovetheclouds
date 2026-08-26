import { describe, it, expect } from 'vitest';
import { parseRssFeed } from '../server/lib/news/rssParser.js';
import { categorize, hashKey } from '../server/lib/news/categorize.js';

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Aerolíneas Argentinas adds new Ezeiza route</title>
    <link>https://example.com/article-1</link>
    <guid>guid-1</guid>
    <pubDate>Mon, 25 Aug 2026 10:00:00 GMT</pubDate>
    <description>Aerolíneas Argentinas announced a new route from Ezeiza to a new destination, expanding its network.</description>
  </item>
  <item>
    <title>Boeing delivers new 787 to launch customer</title>
    <link>https://example.com/article-2</link>
    <guid>guid-2</guid>
    <pubDate>Mon, 25 Aug 2026 09:00:00 GMT</pubDate>
    <description>Boeing has delivered another 787 Dreamliner as part of its ongoing production ramp-up.</description>
  </item>
</channel></rss>`;

describe('parseRssFeed', () => {
  it('extracts structured fields from RSS items', () => {
    const items = parseRssFeed(SAMPLE_RSS, 'Test Source');
    expect(items).toHaveLength(2);
    expect(items[0].title).toContain('Aerolíneas Argentinas');
    expect(items[0].guid).toBe('guid-1');
    expect(items[0].sourceUrl).toBe('https://example.com/article-1');
  });

  it('produces a short summary, not the full description', () => {
    const items = parseRssFeed(SAMPLE_RSS, 'Test Source');
    expect(items[0].summary.length).toBeLessThanOrEqual(230);
  });
});

describe('categorize', () => {
  it('detects Argentina-related news', () => {
    expect(categorize('Aerolíneas Argentinas adds new Ezeiza route', '')).toBe('ARGENTINA');
  });
  it('detects aircraft-related news', () => {
    expect(categorize('Boeing delivers new 787 to launch customer', '')).toBe('AIRCRAFT');
  });
  it('falls back to INDUSTRY for unmatched text', () => {
    expect(categorize('Completely unrelated headline about nothing specific', '')).toBe('INDUSTRY');
  });
});

describe('hashKey', () => {
  it('produces a stable hash for the same input', async () => {
    const a = await hashKey('same-input');
    const b = await hashKey('same-input');
    expect(a).toBe(b);
  });
  it('produces different hashes for different input (dedupe safety)', async () => {
    const a = await hashKey('input-a');
    const b = await hashKey('input-b');
    expect(a).not.toBe(b);
  });
});
