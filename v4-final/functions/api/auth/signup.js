import { d1First, d1Run, nowSeconds, jsonResponse, errorResponse } from '../../../server/lib/db.js';
import { hashPassword, newId, sessionCookie } from '../../../server/lib/auth.js';

/** POST /api/auth/signup   body: { email, username, password } */
export async function onRequestPost({ request, env }) {
  try {
    const { email, username, password } = await request.json();
    if (!email || !username || !password || password.length < 8) {
      return errorResponse('email, username, and a password of 8+ characters are required', 400);
    }
    const existing = await d1First(env, `SELECT id FROM users WHERE email = ? OR username = ?`, email.toLowerCase(), username);
    if (existing) return errorResponse('Email or username already in use', 409);

    const { hash, salt } = await hashPassword(password);
    const userId = newId();
    const now = nowSeconds();

    await d1Run(env, `INSERT INTO users (id, email, username, password_hash, password_salt, created_at) VALUES (?,?,?,?,?,?)`,
      userId, email.toLowerCase(), username, hash, salt, now);
    await d1Run(env, `INSERT INTO profiles (user_id, xp, level, updated_at) VALUES (?,0,1,?)`, userId, now);

    const token = crypto.randomUUID();
    const expiresAt = now + 60 * 60 * 24 * 30;
    await d1Run(env, `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)`, token, userId, now, expiresAt);

    return jsonResponse({ user: { id: userId, username } }, { headers: { 'Set-Cookie': sessionCookie(token) } });
  } catch (err) {
    return errorResponse(err.message, 500);
  }
}
