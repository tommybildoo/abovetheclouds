import { d1First, d1Run, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { verifyPassword, sessionCookie } from '../../../server/lib/auth.js';

/** POST /api/auth/login   body: { email, password } */
export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return errorResponse('email and password are required', 400);

    const user = await d1First(env, `SELECT * FROM users WHERE email = ?`, email.toLowerCase());
    if (!user) return errorResponse('Invalid credentials', 401);

    const valid = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!valid) return errorResponse('Invalid credentials', 401);

    const now = nowSeconds();
    const token = crypto.randomUUID();
    const expiresAt = now + 60 * 60 * 24 * 30;
    await d1Run(env, `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)`, token, user.id, now, expiresAt);
    await d1Run(env, `UPDATE users SET last_login_at = ? WHERE id = ?`, now, user.id);

    return jsonResponse({ user: { id: user.id, username: user.username } }, { headers: { 'Set-Cookie': sessionCookie(token) } });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
