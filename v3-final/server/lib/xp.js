import { d1Run, d1First, nowSeconds } from './db.js';

/**
 * LEVELS — single source of truth for progression. Edit this array to
 * rebalance the game; nothing else needs to change.
 */
export const LEVELS = [
  { level: 1, name: 'Passenger', minXp: 0 },
  { level: 2, name: 'Spotter', minXp: 1000 },
  { level: 3, name: 'Aviation Enthusiast', minXp: 5000 },
  { level: 4, name: 'Aviation Geek', minXp: 15000 },
  { level: 5, name: 'Above The Clouds', minXp: 50000 },
];

export function levelForXp(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  return {
    level: current.level,
    name: current.name,
    xp,
    nextLevelXp: next ? next.minXp : null,
    progress: next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1,
  };
}

export const XP_REWARDS = {
  daily_challenge_correct: 850,
  first_challenge_of_day: 100,
  streak_7: 500,
  streak_weekly_perfect: 2000,
};

/**
 * resolveXpReward — the SINGLE point where an XP amount is allowed to
 * originate. `daily_challenges.xp_reward` in D1 exists only as
 * DISPLAY/reference data (so e.g. the challenge card can show "+850 XP"
 * before answering) — it must never be read back and used directly to
 * award XP, because that would make the reward amount tamperable by
 * anyone who could write to that table (a compromised admin token, a
 * future admin UI bug, a bad migration, etc).
 *
 * awardXp() below only ever looks up XP_REWARDS[reason] — it has no
 * parameter for an externally-supplied amount at all — this helper is
 * for the few places (challenge generation, display) that need to
 * reference "the reward for X" and should do so through this function
 * rather than a magic number, so there is exactly one number to change
 * if the game gets rebalanced.
 */
export function resolveXpReward(reason) {
  const amount = XP_REWARDS[reason];
  if (!amount) throw new Error(`Unknown XP reason: ${reason}`);
  return amount;
}

/**
 * Defense-in-depth check: if some future code path reads a stored
 * xp_reward value (e.g. from daily_challenges) and wants to use it,
 * it MUST pass it through here first. Any value that doesn't match the
 * canonical server-side reward for that reason is rejected outright —
 * the canonical amount is returned instead, the mismatch is never
 * silently trusted.
 */
export function assertMatchesCanonicalReward(reason, storedValue) {
  const canonical = resolveXpReward(reason);
  if (storedValue !== canonical) {
    // Do not throw — this is reference/display data, not a security
    // boundary by itself (awardXp() is the real boundary). Just make
    // sure callers get the trustworthy number.
    return canonical;
  }
  return canonical;
}

/**
 * Awards XP to a user SERVER-SIDE ONLY. Callers pass only a `reason`
 * key — this function is the SOLE place an XP amount is ever produced,
 * looked up directly from the canonical XP_REWARDS table. There is no
 * parameter of any kind for a caller to pass an arbitrary amount, so
 * it is not possible for any call site (this file, an API route, a
 * future feature) to award anything other than one of the fixed,
 * pre-approved reward amounts below. Every award is logged to
 * xp_transactions for auditability, and — when a referenceId is given —
 * is idempotent: calling it again for the same (user, reason,
 * reference) is a safe no-op rather than a double-award. See the
 * idempotency guard below.
 */
export async function awardXp(env, userId, reason, referenceId = null) {
  const amount = XP_REWARDS[reason];
  if (!amount || amount <= 0) {
    throw new Error(`Unknown or invalid XP reason: ${reason}`);
  }

  // Idempotency guard: when a referenceId is supplied, refuse to award
  // the same (user, reason, reference) combination twice — instead
  // return 0 (nothing NEW awarded). This is what makes it safe to call
  // awardXp() again for the same challenge/event after a previous call
  // partially failed partway through a multi-step flow (see
  // functions/api/challenge/answer.js): a retry can safely re-run the
  // whole sequence and each already-completed step becomes a no-op,
  // while any step that didn't finish the first time completes now —
  // without ever double-crediting a step that DID already succeed.
  if (referenceId != null) {
    const existing = await d1First(
      env,
      `SELECT id FROM xp_transactions WHERE user_id = ? AND reason = ? AND reference_id = ? LIMIT 1`,
      userId, reason, referenceId
    );
    if (existing) return 0;
  }

  await d1Run(
    env,
    `INSERT INTO xp_transactions (user_id, amount, reason, reference_id, created_at) VALUES (?, ?, ?, ?, ?)`,
    userId, amount, reason, referenceId, nowSeconds()
  );
  await d1Run(
    env,
    `UPDATE profiles SET xp = xp + ?, updated_at = ? WHERE user_id = ?`,
    amount, nowSeconds(), userId
  );
  const profile = await d1First(env, `SELECT xp FROM profiles WHERE user_id = ?`, userId);
  const { level } = levelForXp(profile.xp);
  await d1Run(env, `UPDATE profiles SET level = ? WHERE user_id = ?`, level, userId);
  return amount;
}

/**
 * Updates streak counters after a completed daily challenge.
 * Returns { currentStreak, longestStreak, streakBroken }.
 */
export async function updateStreak(env, userId, challengeDateUTC) {
  const profile = await d1First(env, `SELECT current_streak, longest_streak, last_challenge_date FROM profiles WHERE user_id = ?`, userId);
  const yesterday = new Date(new Date(challengeDateUTC + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);

  let currentStreak = 1;
  let streakBroken = false;
  if (profile.last_challenge_date === yesterday) {
    currentStreak = profile.current_streak + 1;
  } else if (profile.last_challenge_date === challengeDateUTC) {
    currentStreak = profile.current_streak; // already counted today
  } else if (profile.last_challenge_date) {
    streakBroken = true;
  }

  const longestStreak = Math.max(profile.longest_streak, currentStreak);
  await d1Run(
    env,
    `UPDATE profiles SET current_streak = ?, longest_streak = ?, last_challenge_date = ?, updated_at = ? WHERE user_id = ?`,
    currentStreak, longestStreak, challengeDateUTC, nowSeconds(), userId
  );
  return { currentStreak, longestStreak, streakBroken };
}
