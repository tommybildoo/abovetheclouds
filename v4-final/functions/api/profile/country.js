import { d1First, d1Run, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { getSessionTokenFromRequest } from '../../../server/lib/auth.js';
import { findCountry } from '../../../server/lib/countries.js';

/**
 * POST /api/profile/country   body: { countryCode: "AR" }
 * Persists the authenticated user's chosen country onto their profile
 * (V4 personalization — see src/features/country/CountryContext.jsx,
 * which calls this once a logged-in user picks/changes their country;
 * anonymous visitors keep using localStorage only).
 */
export async function onRequestPost({ request, env }) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) return errorResponse('Not authenticated', 401);

    const session = await d1First(env, `SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?`, token, nowSeconds());
    if (!session) return errorResponse('Session expired', 401);

    const { countryCode } = await request.json();
    if (!countryCode || typeof countryCode !== 'string') return errorResponse('Missing countryCode', 400);

    // Validate against the curated list rather than accepting any string —
    // an unrecognized code is rejected rather than silently stored, since
    // downstream bbox/airport lookups only understand curated codes.
    if (!findCountry(countryCode)) return errorResponse('Unknown country code', 400);

    await d1Run(
      env,
      `UPDATE profiles SET country_code = ?, updated_at = ? WHERE user_id = ?`,
      countryCode.toUpperCase(), nowSeconds(), session.user_id
    );

    return jsonResponse({ countryCode: countryCode.toUpperCase() });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
