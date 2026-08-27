import { d1All, d1Run, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { getSessionTokenFromRequest } from '../../../server/lib/auth.js';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const PHOTO_CACHE_CONTROL = 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400';

async function commonsAircraftPhotos() {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: 'aircraft airliner aviation filetype:bitmap',
    gsrnamespace: '6',
    gsrlimit: '50',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '3840',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${COMMONS_API}?${params}`, {
    headers: {
      'User-Agent': 'AboveTheClouds/4.0 (https://abovetheclouds.club) aviation community site',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Wikimedia Commons request failed: ${res.status}`);
  const json = await res.json();
  return Object.values(json.query?.pages || {}).map((page, index) => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    const title = page.title?.replace(/^File:/, '') || 'Aircraft';
    return {
      id: `commons-${page.pageid || index}`,
      image_url: info?.thumburl || info?.url,
      original_url: info?.url,
      username: 'Wikimedia Commons',
      aircraft: title.replace(/\.[^.]+$/, ''),
      airport: null,
      location: 'Wikimedia Commons',
      caption: meta.ImageDescription?.value?.replace(/<[^>]+>/g, '').slice(0, 240) || null,
      author: meta.Artist?.value?.replace(/<[^>]+>/g, '').slice(0, 160) || null,
      license: meta.LicenseShortName?.value || null,
      source: 'Wikimedia Commons',
      source_url: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
      width: info?.width || null,
      height: info?.height || null,
    };
  }).filter((p) =>
    p.image_url &&
    ['image/jpeg', 'image/png', 'image/webp'].includes(p.mime || '') &&
    (p.width || 0) >= 2500 &&
    (p.height || 0) >= 1400
  );
}

function photosResponse(photos, source) {
  return new Response(JSON.stringify({ photos, source }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': PHOTO_CACHE_CONTROL,
    },
  });
}

export async function onRequestGet({ env }) {
  try {
    const rows = await d1All(env, `SELECT * FROM photos WHERE status = 'approved' ORDER BY created_at DESC LIMIT 40`);
    const commons = await commonsAircraftPhotos();
    return photosResponse([...rows, ...commons].slice(0, 40), rows.length ? 'community+commons' : 'commons');
  } catch (err) {
    try {
      const commons = await commonsAircraftPhotos();
      return photosResponse(commons.slice(0, 40), 'commons');
    } catch {
      return errorResponse(err.message, 500);
    }
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) return errorResponse('Not authenticated', 401);
    const body = await request.json();
    const { imageUrl, aircraft, airport, location, caption, takenDate, username } = body;
    if (!imageUrl || !username) return errorResponse('imageUrl and username are required', 400);
    await d1Run(env, `INSERT INTO photos (username, image_url, aircraft, airport, location, caption, taken_date, status, created_at)
      VALUES (?,?,?,?,?,?,?,'pending',?)`, username, imageUrl, aircraft || null, airport || null, location || null, caption || null, takenDate || null, nowSeconds());
    return jsonResponse({ submitted: true, status: 'pending' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
