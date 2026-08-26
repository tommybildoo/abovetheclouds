/**
 * Minimal, dependency-free RSS/Atom parser using the Workers-native
 * HTMLRewriter-adjacent DOMParser is not available in Workers, so this
 * uses a small regex-based extractor tuned for the common RSS 2.0 /
 * Atom item shapes. It intentionally extracts only structured fields
 * (title, link, pubDate, guid, description, image) and NEVER stores the
 * full <content:encoded> / full article body — see news_articles.summary,
 * which must be a short, original-wording summary, not a copy of the feed.
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

/**
 * Produces a SHORT, plain-text summary from a feed description.
 * Truncates aggressively — this is meant to be a teaser, not a copy of
 * the article. Sites should always link to the original for the full
 * story (see news_articles.source_url / "Read full story").
 */
function shortSummary(description, maxLen = 220) {
  const text = stripHtml(description || '');
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

export function parseRssFeed(xml, sourceName) {
  const items = [];
  const itemBlocks = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || xml.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link') || extractAttr(block, 'link', 'href');
    const guid = extractTag(block, 'guid') || extractTag(block, 'id') || link;
    const pubDateRaw = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    const mediaUrl =
      extractAttr(block, 'media:content', 'url') ||
      extractAttr(block, 'enclosure', 'url') ||
      (block.match(/<img[^>]+src=["']([^"']+)["']/i) || [])[1] ||
      null;

    if (!title || !link) continue;

    items.push({
      title: stripHtml(title),
      sourceUrl: link.trim(),
      guid: (guid || link).trim(),
      publishedAt: pubDateRaw ? Math.floor(new Date(pubDateRaw).getTime() / 1000) : Math.floor(Date.now() / 1000),
      imageUrl: mediaUrl,
      summary: shortSummary(description),
      source: sourceName,
    });
  }
  return items;
}
