/**
 * Small dependency-free RSS/Atom parser for Cloudflare Workers.
 * Extracts only article metadata: title, link, date, guid, image and a
 * short summary. The full article body is never stored.
 */

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  return m[1]
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim();
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

function stripHtml(str) {
  return str ? str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

function absoluteUrl(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

function shortSummary(description, maxLen = 220) {
  const text = stripHtml(description || '');
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

function findImage(block, baseUrl) {
  const candidates = [
    extractAttr(block, 'media:content', 'url'),
    extractAttr(block, 'media:thumbnail', 'url'),
    extractAttr(block, 'enclosure', 'url'),
    extractAttr(block, 'image', 'href'),
    (block.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i) || [])[1],
  ];

  for (const candidate of candidates) {
    if (candidate) return absoluteUrl(candidate, baseUrl);
  }

  return null;
}

export function parseRssFeed(xml, sourceName, sourceUrl = '') {
  const items = [];
  const itemBlocks = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const rawLink = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const link = absoluteUrl(rawLink, sourceUrl);
    const guid = extractTag(block, 'guid') || extractTag(block, 'id') || link;
    const pubDateRaw = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content:encoded') || extractTag(block, 'content');
    const imageUrl = findImage(block, sourceUrl);

    if (!title || !link) continue;

    const parsedDate = pubDateRaw ? new Date(pubDateRaw).getTime() : Date.now();

    items.push({
      title: stripHtml(title),
      sourceUrl: link.trim(),
      guid: (guid || link).trim(),
      publishedAt: Number.isFinite(parsedDate) ? Math.floor(parsedDate / 1000) : Math.floor(Date.now() / 1000),
      imageUrl,
      summary: shortSummary(description),
      source: sourceName,
    });
  }
  return items;
}
