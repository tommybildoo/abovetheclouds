import { d1First, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/admin/dashboard
 * Protected via ADMIN_TOKEN secret (see .env.example). In production,
 * replace this simple shared-secret check with real admin-role sessions.
 */
export async function onRequestGet({ request, env }) {
  const provided = request.headers.get('X-Admin-Token');
  if (!env.ADMIN_TOKEN || provided !== env.ADMIN_TOKEN) {
    return errorResponse('Forbidden', 403);
  }
  try {
    const users = await d1First(env, `SELECT COUNT(*) as c FROM users`);
    const dau = await d1First(env, `SELECT COUNT(DISTINCT user_id) as c FROM xp_transactions WHERE created_at >= strftime('%s','now','-1 day')`);
    const challengesCompleted = await d1First(env, `SELECT COUNT(*) as c FROM challenge_attempts WHERE is_correct = 1`);
    const xpAwarded = await d1First(env, `SELECT COALESCE(SUM(amount),0) as c FROM xp_transactions`);
    const newsImported = await d1First(env, `SELECT COUNT(*) as c FROM news_articles`);
    const liveFlights = await d1First(env, `SELECT COUNT(*) as c FROM flights_cache`);
    const photosSubmitted = await d1First(env, `SELECT COUNT(*) as c FROM photos`);

    return jsonResponse({
      users: users.c,
      dailyActiveUsers: dau.c,
      challengesCompleted: challengesCompleted.c,
      xpAwarded: xpAwarded.c,
      newsImported: newsImported.c,
      liveFlightsCached: liveFlights.c,
      photosSubmitted: photosSubmitted.c,
    });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
