import { describe, it, expect } from 'vitest';

/**
 * Lightweight fake-D1 for testing challenge/XP logic without a real
 * Cloudflare binding. Mirrors the small subset of the D1 API used by
 * server/lib/db.js (prepare().bind().first()/.all()/.run()), including
 * the dedupe-lookup query awardXp() now runs when a referenceId is
 * supplied (see server/lib/xp.js).
 */
function makeFakeD1() {
  const rows = {
    xp_transactions: [], // {user_id, amount, reason, reference_id}
    profiles: [{ user_id: 'u1', xp: 0, level: 1, current_streak: 0, longest_streak: 0, last_challenge_date: null }],
  };
  return {
    rows,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes('FROM xp_transactions WHERE user_id = ? AND reason = ? AND reference_id')) {
                const [userId, reason, referenceId] = params;
                const found = rows.xp_transactions.find((t) => t.user_id === userId && t.reason === reason && t.reference_id === referenceId);
                return found ? { id: 1 } : null;
              }
              if (sql.includes('FROM profiles')) {
                return rows.profiles.find((p) => p.user_id === params[0]);
              }
              return null;
            },
            async all() { return { results: [] }; },
            async run() {
              if (sql.startsWith('INSERT INTO xp_transactions')) {
                const [userId, amount, reason, referenceId] = params;
                rows.xp_transactions.push({ user_id: userId, amount, reason, reference_id: referenceId });
              }
              if (sql.startsWith('UPDATE profiles SET xp')) {
                // SQL: UPDATE profiles SET xp = xp + ?, updated_at = ? WHERE user_id = ?
                const [amount, , userId] = params;
                const p = rows.profiles.find((p) => p.user_id === userId);
                if (p) p.xp += amount;
              }
              if (sql.startsWith('UPDATE profiles SET level')) {
                const [level, userId] = params;
                const p = rows.profiles.find((p) => p.user_id === userId);
                if (p) p.level = level;
              }
              return { success: true };
            },
          };
        },
      };
    },
  };
}

describe('awardXp (server-authoritative XP)', () => {
  it('rejects unknown XP reasons rather than trusting a client-supplied amount', async () => {
    const { awardXp } = await import('../server/lib/xp.js');
    const env = { DB: makeFakeD1() };
    await expect(awardXp(env, 'u1', 'totally_made_up_reason')).rejects.toThrow();
  });

  it('awards the exact server-configured amount for a known reason — there is no parameter to override it', async () => {
    const { awardXp, XP_REWARDS } = await import('../server/lib/xp.js');
    const env = { DB: makeFakeD1() };
    const amount = await awardXp(env, 'u1', 'daily_challenge_correct');
    expect(amount).toBe(XP_REWARDS.daily_challenge_correct);
    expect(env.DB.rows.profiles[0].xp).toBe(XP_REWARDS.daily_challenge_correct);
  });

  it('has no customAmount-style parameter at all (Function.length is 3: env, userId, reason — referenceId has a default so it is not counted)', async () => {
    const { awardXp } = await import('../server/lib/xp.js');
    expect(awardXp.length).toBe(3);
  });

  it('is idempotent per (user, reason, referenceId) — calling twice for the same reference does not double-award', async () => {
    const { awardXp, XP_REWARDS } = await import('../server/lib/xp.js');
    const env = { DB: makeFakeD1() };

    const first = await awardXp(env, 'u1', 'daily_challenge_correct', 'challenge-42');
    const second = await awardXp(env, 'u1', 'daily_challenge_correct', 'challenge-42');

    expect(first).toBe(XP_REWARDS.daily_challenge_correct);
    expect(second).toBe(0); // no new XP on the repeat call
    expect(env.DB.rows.profiles[0].xp).toBe(XP_REWARDS.daily_challenge_correct); // not double-counted
  });

  it('idempotency is scoped per reference — a different reference still awards normally', async () => {
    const { awardXp, XP_REWARDS } = await import('../server/lib/xp.js');
    const env = { DB: makeFakeD1() };

    await awardXp(env, 'u1', 'daily_challenge_correct', 'challenge-1');
    const secondChallenge = await awardXp(env, 'u1', 'daily_challenge_correct', 'challenge-2');

    expect(secondChallenge).toBe(XP_REWARDS.daily_challenge_correct);
    expect(env.DB.rows.profiles[0].xp).toBe(XP_REWARDS.daily_challenge_correct * 2);
  });

  it('skips the idempotency check entirely when no referenceId is given (unscoped awards are never deduped)', async () => {
    const { awardXp, XP_REWARDS } = await import('../server/lib/xp.js');
    const env = { DB: makeFakeD1() };

    await awardXp(env, 'u1', 'daily_challenge_correct');
    const second = await awardXp(env, 'u1', 'daily_challenge_correct');

    expect(second).toBe(XP_REWARDS.daily_challenge_correct); // both awarded — no referenceId to dedupe on
  });
});
