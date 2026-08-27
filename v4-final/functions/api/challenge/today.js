import { getOrCreateTodayChallenge } from '../../../server/lib/challenges.js';
import { jsonResponse, errorResponse } from '../../../server/lib/db.js';

/**
 * GET /api/challenge/today?country=AR — generates (once/day, idempotent)
 * and returns today's challenge, minus the answer.
 *
 * `country` is a soft hint only used if THIS request happens to be the
 * one that generates the day's challenge (see
 * getOrCreateTodayChallenge's docstring) — there is still one shared
 * challenge per day, not a per-user/per-country one.
 *
 * The `xp_reward` field included in the response is DISPLAY-ONLY (e.g.
 * "+850 XP" shown on the card before answering) — it is written by
 * server/lib/challenges.js from the canonical XP_REWARDS table via
 * resolveXpReward(), and /api/challenge/answer independently looks up
 * the same canonical table itself rather than trusting this stored
 * value. See server/lib/xp.js.
 */
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    const challenge = await getOrCreateTodayChallenge(env, country);
    if (!challenge) {
      return jsonResponse({ challenge: null, message: 'Challenge data not seeded yet — add aircraft via /admin or the aircraft seed script.' });
    }
    const { correct_answer, ...safe } = challenge;
    return jsonResponse({
      challenge: { ...safe, options: JSON.parse(challenge.options_json) },
    });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
