import { d1All, d1Run, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { getSessionTokenFromRequest } from '../../../server/lib/auth.js';

/**
 * GET  /api/photos            -> approved photos only (public community grid)
 * POST /api/photos            -> submit a photo for moderation (requires auth), status='pending'
 */
export async function onRequestGet({ env }) {
  try {
    const rows = await d1All(env, `SELECT * FROM photos WHERE status = 'approved' ORDER BY created_at DESC LIMIT 40`);
    return jsonResponse({ photos: rows });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) return errorResponse('Not authenticated', 401);

    const body = await request.json();
    const { imageUrl, aircraft, airport, location, caption, takenDate, username } = body;
    if (!imageUrl || !username) return errorResponse('imageUrl and username are required', 400);

    await d1Run(
      env,
      `INSERT INTO photos (username, image_url, aircraft, airport, location, caption, taken_date, status, created_at)
       VALUES (?,?,?,?,?,?,?,'pending',?)`,
      username, imageUrl, aircraft || null, airport || null, location || null, caption || null, takenDate || null, nowSeconds()
    );
    return jsonResponse({ submitted: true, status: 'pending' });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
