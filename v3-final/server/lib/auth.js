/**
 * Minimal auth helpers using the Web Crypto API (available natively in
 * Cloudflare Workers — no extra dependency needed).
 *
 * Passwords are hashed with PBKDF2-SHA256, 100,000 iterations, a random
 * 16-byte salt per user. Only the hash + salt are ever stored — see
 * users.password_hash / users.password_salt in the schema.
 *
 * Sessions use a signed, httpOnly cookie holding a random session id;
 * for a first deployment this can be looked up against a KV or D1
 * table (not included here to keep the schema minimal) — see README
 * "Auth" section for the recommended next step (Cloudflare KV session
 * store or a `sessions` D1 table).
 */

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

export async function verifyPassword(password, storedHashHex, storedSaltHex) {
  const salt = fromHex(storedSaltHex);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return toHex(bits) === storedHashHex;
}

export function newId() {
  return crypto.randomUUID();
}

/** Reads a bearer/session token from the request cookie header. */
export function getSessionTokenFromRequest(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/atc_session=([^;]+)/);
  return match ? match[1] : null;
}

export function sessionCookie(token, maxAgeSeconds = 60 * 60 * 24 * 30) {
  return `atc_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}
