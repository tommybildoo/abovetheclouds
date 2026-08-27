import { d1Run } from '../../server/lib/db.js';

/**
 * Scheduled worker — routine database cleanup.
 * Cron suggestion: once daily, e.g. "30 3 * * *".
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(cleanup(env));
  },
  async fetch(_request, env) {
    const result = await cleanup(env);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  },
};

async function cleanup(env) {
  await d1Run(env, `DELETE FROM flight_snapshots WHERE recorded_at < strftime('%s','now','-2 days')`);
  await d1Run(env, `DELETE FROM sessions WHERE expires_at < strftime('%s','now')`);
  await d1Run(env, `DELETE FROM flights_cache WHERE updated_at < strftime('%s','now','-1 hour')`);
  return { ok: true };
}
