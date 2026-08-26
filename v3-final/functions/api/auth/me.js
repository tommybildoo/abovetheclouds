import { d1First, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { getSessionTokenFromRequest } from '../../../server/lib/auth.js';
import { levelForXp } from '../../../server/lib/xp.js';

/** GET /api/auth/me — current user profile, or 401 if not logged in. */
export async function onRequestGet({ request, env }) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) return errorResponse('Not authenticated', 401);

    const session = await d1First(env, `SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?`, token, nowSeconds());
    if (!session) return errorResponse('Session expired', 401);

    const user = await d1First(env, `SELECT id, username, email FROM users WHERE id = ?`, session.user_id);
    const profile = await d1First(env, `SELECT * FROM profiles WHERE user_id = ?`, session.user_id);
    const badges = await env.DB.prepare(`SELECT badge_id FROM user_badges WHERE user_id = ?`).bind(session.user_id).all();

    return jsonResponse({
      user,
      profile: { ...profile, ...levelForXp(profile.xp) },
      badges: badges.results.map((b) => b.badge_id),
    });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
