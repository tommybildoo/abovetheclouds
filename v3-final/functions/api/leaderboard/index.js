import { d1All, jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/leaderboard?period=today|weekly|monthly|alltime
 * Always computed from xp_transactions (server-side ledger) — the
 * frontend can never submit a score directly.
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';

    const windowClause = {
      today: `created_at >= strftime('%s', 'now', 'start of day')`,
      weekly: `created_at >= strftime('%s', 'now', '-7 days')`,
      monthly: `created_at >= strftime('%s', 'now', '-30 days')`,
      alltime: `1=1`,
    }[period] || `1=1`;

    const rows = await d1All(
      env,
      `SELECT u.username, SUM(t.amount) as xp
       FROM xp_transactions t
       JOIN users u ON u.id = t.user_id
       WHERE ${windowClause}
       GROUP BY t.user_id
       ORDER BY xp DESC
       LIMIT 50`
    );

    return jsonResponse({
      period,
      leaderboard: rows.map((r, i) => ({ rank: i + 1, username: r.username, xp: r.xp })),
    });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
