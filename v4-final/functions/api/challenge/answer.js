import { d1First, d1Run, nowSeconds, todayUTC, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { awardXp, updateStreak, XP_REWARDS } from '../../../server/lib/xp.js';
import { getSessionTokenFromRequest } from '../../../server/lib/auth.js';

/**
 * POST /api/challenge/answer   body: { challengeId, answer }
 *
 * SECURITY-CRITICAL endpoint. XP is never trusted from the client, and
 * scoring is ATOMIC and FAILURE-SAFE:
 *
 *  1. ATOMIC CLAIM: the attempt row is INSERTed FIRST (xp_awarded=0 as
 *     a placeholder), and challenge_attempts' UNIQUE(user_id,
 *     challenge_id) constraint makes this insert the single atomic
 *     "claim" of this challenge for this user — only one concurrent
 *     request can win it. A request that loses the race reads back
 *     whatever the winner recorded instead of awarding anything.
 *
 *  2. FAILURE RECOVERY: if the reward-granting steps that run AFTER a
 *     successful claim fail partway (a transient D1 error, a network
 *     blip, a Worker eviction mid-request, etc.), the claim itself is
 *     already durably recorded — so a naive design would either lose
 *     the user's earned XP forever (if a retry just reads the
 *     placeholder 0 and stops) or double-award it (if a retry blindly
 *     re-runs every step). Neither is acceptable, so:
 *       - awardXp() is idempotent per (user, reason, challengeId) — see
 *         server/lib/xp.js. Re-running the exact same sequence of
 *         awardXp() calls is always safe: whatever already succeeded
 *         becomes a no-op, whatever didn't finish completes now.
 *       - finalizeCorrectAnswer() (below) is therefore safe to call
 *         BOTH on a fresh winning claim AND, if needed, again when a
 *         later request finds this challenge already claimed as
 *         correct — closing the gap where a crash between the claim
 *         and the reward would otherwise strand the user at 0 XP with
 *         no way to recover it.
 *       - the profiles.challenges_completed counter (not an XP ledger
 *         row, so not covered by awardXp's own guard) is only
 *         incremented when the base reward was NEWLY granted in this
 *         call, which — thanks to awardXp's idempotency — happens at
 *         most once per challenge no matter how many retries occur.
 *       - the XP total returned to the client and persisted on the
 *         attempt row is always recomputed from the xp_transactions
 *         ledger (the source of truth) rather than trusted from a
 *         locally-accumulated variable, so it's correct even after a
 *         multi-step partial failure and resume.
 *
 *  XP amounts always come from server/lib/xp.js (XP_REWARDS) — never
 *  from the request body, and never from daily_challenges.xp_reward
 *  (see xp.js for why that DB column is treated as informational only,
 *  not authoritative).
 *
 * Requires an authenticated session (see functions/api/auth/*).
 */
export async function onRequestPost({ request, env }) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) return errorResponse('Not authenticated', 401);

    const session = await d1First(env, `SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?`, token, nowSeconds());
    if (!session) return errorResponse('Session expired', 401);
    const userId = session.user_id;

    const { challengeId, answer } = await request.json();
    if (!challengeId || typeof answer !== 'string') return errorResponse('Missing challengeId or answer', 400);

    const challenge = await d1First(env, `SELECT * FROM daily_challenges WHERE id = ?`, challengeId);
    if (!challenge) return errorResponse('Challenge not found', 404);

    const submittedIsCorrect = answer.trim() === challenge.correct_answer.trim();

    // --- Atomic claim ---
    let wonClaim = true;
    try {
      await d1Run(
        env,
        `INSERT INTO challenge_attempts (user_id, challenge_id, answer_given, is_correct, xp_awarded, attempted_at) VALUES (?,?,?,?,0,?)`,
        userId, challengeId, answer, submittedIsCorrect ? 1 : 0, nowSeconds()
      );
    } catch (err) {
      if (String(err.message || '').toUpperCase().includes('UNIQUE')) {
        wonClaim = false; // another request already claimed this challenge for this user
      } else {
        throw err;
      }
    }

    // The authoritative verdict is always whatever is actually stored
    // for this claim — NOT necessarily this request's own answer. If
    // we won the claim, that's the same as submittedIsCorrect (we just
    // wrote it). If someone else already claimed it, a resubmitted
    // (possibly different) answer in THIS request must never override
    // the recorded verdict — otherwise a retry with different text
    // could incorrectly trigger (or skip) reward finalization.
    let isCorrect = submittedIsCorrect;
    if (!wonClaim) {
      const existing = await d1First(env, `SELECT is_correct FROM challenge_attempts WHERE user_id = ? AND challenge_id = ?`, userId, challengeId);
      isCorrect = !!existing.is_correct;
    }

    let streakInfo = null;

    if (isCorrect) {
      // Whether we just won the claim, or this challenge was already
      // claimed as correct by an earlier (possibly partially-failed)
      // request, it's always safe to (re)run the reward sequence —
      // idempotency guarantees no double-award and completes anything
      // left unfinished.
      try {
        const result = await finalizeCorrectAnswer(env, userId, challengeId);
        streakInfo = result.streakInfo;
      } catch (err) {
        // Reward granting failed. The claim (and the correctness
        // verdict) are already durably recorded, so nothing is lost —
        // a subsequent request for this same challenge will retry and
        // complete finalizeCorrectAnswer() safely. Persist whatever
        // the ledger actually reflects right now before reporting the
        // error, so the stored xp_awarded is never stale/wrong.
        await persistLedgerTotal(env, userId, challengeId);
        return errorResponse('Your answer was recorded, but awarding XP failed. Please try again.', 500);
      }
    }

    const xpAwarded = await persistLedgerTotal(env, userId, challengeId);

    return jsonResponse({
      alreadyAnswered: !wonClaim,
      isCorrect,
      correctAnswer: challenge.correct_answer,
      explanation: challenge.explanation,
      xpAwarded,
      streak: streakInfo,
    });
  } catch (err) {
    return errorResponse(err.message || 'Unexpected error', 500);
  }
}

/**
 * Grants every reward tied to a correct answer. Safe to call more than
 * once for the same (userId, challengeId) — see the module docstring
 * above for why. Returns the streak info from THIS invocation (null if
 * every step was already complete and nothing new happened).
 */
async function finalizeCorrectAnswer(env, userId, challengeId) {
  const baseAwarded = await awardXp(env, userId, 'daily_challenge_correct', String(challengeId));

  const profile = await d1First(env, `SELECT last_challenge_date FROM profiles WHERE user_id = ?`, userId);
  const alreadyCompletedToday = profile.last_challenge_date === todayUTC();
  if (!alreadyCompletedToday) {
    await awardXp(env, userId, 'first_challenge_of_day', String(challengeId));
  }

  const streakInfo = await updateStreak(env, userId, todayUTC());
  if (streakInfo.currentStreak === 7) {
    await awardXp(env, userId, 'streak_7', String(challengeId));
  }

  // Only increment the completed-challenges counter the first time the
  // base reward is actually newly granted (baseAwarded > 0) — thanks to
  // awardXp's idempotency guard, that is true at most once per
  // challenge no matter how many times this function is retried.
  //
  // Known narrow edge case: if a previous call successfully awarded the
  // base reward but crashed before reaching this increment, a later
  // resume sees baseAwarded === 0 (correctly, to avoid re-awarding XP)
  // and therefore also skips this increment, undercounting
  // challenges_completed by at most 1 for that user. This does not
  // affect XP integrity (the security-critical property) — only a
  // display counter — and fully closing it would need a dedicated
  // idempotency key for this specific step, which is out of scope for
  // this fix.
  if (baseAwarded > 0) {
    await d1Run(
      env,
      `UPDATE profiles SET challenges_completed = challenges_completed + 1, updated_at = ? WHERE user_id = ?`,
      nowSeconds(), userId
    );
  }

  return { streakInfo };
}

/**
 * Recomputes the true XP total for this (user, challenge) directly
 * from the xp_transactions ledger — the source of truth — and persists
 * it onto the claimed challenge_attempts row. Using the ledger instead
 * of a locally-accumulated number means the stored/returned total is
 * always correct even if reward-granting needed more than one attempt
 * to fully complete.
 */
async function persistLedgerTotal(env, userId, challengeId) {
  const row = await d1First(
    env,
    `SELECT COALESCE(SUM(amount), 0) as total FROM xp_transactions WHERE user_id = ? AND reference_id = ?`,
    userId, String(challengeId)
  );
  const total = row.total || 0;
  await d1Run(
    env,
    `UPDATE challenge_attempts SET xp_awarded = ? WHERE user_id = ? AND challenge_id = ?`,
    total, userId, challengeId
  );
  return total;
}

// Re-exported so tests can assert this endpoint never reaches for a
// reward amount outside the server-authoritative table.
export const _ALLOWED_XP_REASONS = Object.keys(XP_REWARDS);
