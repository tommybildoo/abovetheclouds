import { getOrCreateTodayChallenge } from '../../server/lib/challenges.js';

/**
 * Scheduled worker — ensures today's challenge exists.
 * Cron suggestion: once daily shortly after UTC midnight, e.g. "5 0 * * *".
 * Also safe to leave unscheduled — /api/challenge/today creates it lazily
 * on first request of the day too (getOrCreateTodayChallenge is idempotent
 * via the UNIQUE constraint on challenge_date).
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(getOrCreateTodayChallenge(env));
  },
  async fetch(_request, env) {
    const challenge = await getOrCreateTodayChallenge(env);
    return new Response(JSON.stringify({ challenge }), { headers: { 'Content-Type': 'application/json' } });
  },
};
