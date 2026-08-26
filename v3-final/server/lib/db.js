/**
 * Small D1 helpers shared by every Pages Function / Worker.
 * D1 binding is attached as `env.DB` (configured in wrangler.toml).
 */
export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function d1First(env, sql, ...params) {
  return env.DB.prepare(sql).bind(...params).first();
}

export async function d1All(env, sql, ...params) {
  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return results;
}

export async function d1Run(env, sql, ...params) {
  return env.DB.prepare(sql).bind(...params).run();
}

export function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    status: init.status || 200,
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, { status });
}
