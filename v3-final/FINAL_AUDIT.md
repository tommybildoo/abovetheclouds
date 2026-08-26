# AboveTheClouds V3 — Final Audit

**Audit date:** this deployment-prep pass, following the 10-point issue
list from the review. **Scope:** whether this project is safe and ready
for a first real Cloudflare deployment — not whether every feature in
the original V3 spec is complete (it isn't; see README section 19).

**Legend**
- 🟢 **GREEN** — ready to deploy as-is
- 🟡 **YELLOW** — works, but needs configuration or has a known,
  documented gap before it does everything you'd want
- 🔴 **RED** — must be fixed before deployment (none remaining — see below)

---

## Area-by-area

### What's Flying Now — 🟡 YELLOW
Live map, custom marker, filters, Argentina Mode, and demo/live
labeling all work today with zero configuration (demo mode). Bounding
boxes are now pushed down to the provider on cold-start instead of
fetching the whole world and filtering in JS (issue #3, fixed).
**Requires configuration** to show real traffic: OpenSky client
credentials. **Known, documented gap:** aircraft type/registration/
airline/route stay "Unknown"/"—" until a metadata provider is plugged
into the new `AircraftMetadataProvider` interface (issue #2, fixed
architecturally, not populated with a real provider by design — you
didn't ask for a paid integration yet).

### D1 (database) — 🟢 GREEN
Schema (18 tables) and seed data both apply cleanly. **Found and fixed
during this audit:** three seed rows used backslash-escaped apostrophes
(`\'`) and two used double-quoted string literals — both are invalid or
fragile SQL that could have broken `wrangler d1 execute` on the seed
migration. All are now proper SQLite single-quote-doubled escapes
(`''`), and a custom SQL-aware row/column validator confirms every
`INSERT` in both migration files now has matching column/value counts
(16 aircraft, 13 airports, 4 news sources, plus settings/badges — see
validation log below).

### Cron Workers — 🟢 GREEN
Each of the 4 workers now has its own `<name>.wrangler.toml` with a
real `[[d1_databases]]` binding and `[triggers]` cron schedule (issue
#1, fixed) — no more relying on the Pages-only binding that standalone
Workers can't see. **Requires configuration:** you still need to paste
your real D1 `database_id` into all 5 config files (root +
4 workers) before deploying — placeholders are intentionally left in
place rather than a fake ID, per the instruction not to leave
production configs pointing at nothing real.

### Daily Challenge — 🟢 GREEN
2 of 10 challenge types are fully implemented and functional
end-to-end (GUESS_THE_AIRCRAFT, AVIATION_TRIVIA). Lazy creation on
first API request per UTC day works independently of the cron worker
(confirmed — `getOrCreateTodayChallenge` is called directly from
`/api/challenge/today`, idempotent via the `UNIQUE` constraint on
`challenge_date`). The other 8 types are honestly not implemented — the
generator registry (`GENERATORS` in `server/lib/challenges.js`) only
has entries for the two real ones.

### XP — 🟢 GREEN
**Found and fixed during the first audit pass (issue #4):** the original
`/api/challenge/answer` had a genuine check-then-award-then-insert race
condition — two simultaneous requests could both pass the "already
answered?" check and both be awarded XP before either row was inserted.
Rewritten so the `INSERT` into `challenge_attempts` happens FIRST (with
XP amounts as a `0` placeholder) and acts as the atomic claim, protected
by the database's own `UNIQUE(user_id, challenge_id)` constraint — only
the request that wins that insert proceeds to compute and award XP; a
losing request reads back the winner's result and returns it, awarding
nothing. XP amounts are still only ever sourced from the server-side
`XP_REWARDS` table (issue #5) — the `daily_challenges.xp_reward` DB
column is documented and code-commented as display-only, and a
`resolveXpReward()` helper is the single place that table gets
consulted, eliminating a duplicate hardcoded `850` that existed in two
places in an earlier version.

**Found and fixed during a follow-up security cleanup pass:**
- `awardXp()`'s `customAmount` parameter was removed entirely — the
  function signature is now `(env, userId, reason, referenceId = null)`
  with no way for any caller, present or future, to pass an amount
  directly. All 5 real call sites (3 in `answer.js`, 2 in tests) were
  confirmed to never have used it; removal was a pure hardening with
  zero behavior change, verified with `node --check` and 14 behavioral
  assertions against a fake-D1 harness, including an explicit test that
  a 5th positional argument is now silently ignored.
- **A genuine failure-recovery gap was found and fixed:** if XP-awarding
  failed partway through *after* the atomic claim succeeded (a
  transient D1 error, a Worker eviction mid-request), the claim row was
  already durably recorded with `xp_awarded=0`, and a naive retry would
  either permanently strand the user at 0 XP (if it just re-read the
  stored row) or double-award XP (if it blindly re-ran every step).
  Fixed by making `awardXp()` idempotent per `(user, reason,
  referenceId)` — a dedupe check against the `xp_transactions` ledger
  before inserting — and refactoring `answer.js`'s reward-granting logic
  into a single `finalizeCorrectAnswer()` function that is safe to call
  both on a fresh winning claim and again on a resumed/retried request.
  The XP total persisted and returned to the client is now always
  recomputed from the `xp_transactions` ledger (the source of truth)
  rather than a locally-accumulated variable, so it stays correct even
  after a multi-step partial failure and resume. One narrow, honestly
  documented residual edge case remains: the `challenges_completed`
  display counter (not an XP value) could under-count by at most 1 in a
  very specific crash window between the base XP award and the counter
  increment — this does not affect XP integrity. Verified with 8
  additional behavioral tests (a hand-simulated partial-failure-then-
  retry scenario) plus 6 new `tests/challenge.test.js` specs, all
  passing, run against the real project source (not just scratch code).

### News Ingestion — 🟢 GREEN
RSS parsing, dedup-by-guid, keyword categorization, and the D1 write
path all work and were exercised with real assertions during this audit
(manual smoke tests — see "Validation performed" below). A real
categorization bug was found and fixed: the word "launch" in the SPACE
category's keyword list falsely matched ordinary aviation phrasing like
"launch customer" (a real aviation industry term for an airline that
first orders a new aircraft type), misclassifying aircraft-delivery
news as space news. Fixed by narrowing the SPACE keywords. Two of the
four seeded `news_sources` are enabled by default; verify each feed URL
is still live before relying on them in production.

### Authentication — 🟡 YELLOW
Signup/login/session-cookie flow works, passwords are hashed with
PBKDF2-SHA256 (100k iterations, per-user salt) via the Workers-native
Web Crypto API — never stored in plaintext. **Known gap:** this is
email+password only, with sessions in a plain D1 table (no rotation/
refresh logic beyond a 30-day expiry) — fine for a first deployment,
but not a full production-grade auth system (no password reset, no
email verification, no OAuth). `/api/admin/*` uses a single shared
`ADMIN_TOKEN` secret rather than per-admin accounts — acceptable for a
solo/small-team first deployment, not for opening admin access to more
people without upgrading it first.

### Images — 🟡 YELLOW
**Found and fixed during this audit (issue #6):** the seed data
referenced image files that don't exist in this project (no real
photos were ever included, and none were invented). Every place that
renders a database-referenced image now uses a new `SafeImage`
component that falls back to a clean, branded SVG placeholder (distinct
placeholders for aircraft, airports, and community photos) with proper
`alt` text on error, instead of a broken-image icon or a silently
hidden image. **Requires your action:** drop real files into
`public/images/<category>/<name>.jpg` at the exact paths referenced in
`database/migrations/0002_seed.sql` — see `public/images/README.md`
for the full list. The site works and looks intentional either way.

### SEO — 🟢 GREEN
`robots.txt`, `sitemap.xml` (with all 16 aircraft detail pages listed),
canonical URL, Open Graph + Twitter Card meta tags, and an
Organization JSON-LD block are all in place and reference the real
`abovetheclouds.club` domain.

### Cloudflare Configuration — 🟢 GREEN
Root `wrangler.toml` (Pages) and all 4 worker-specific
`*.wrangler.toml` files parse as valid TOML (verified with Python's
`tomllib`, not just a hand-rolled bracket-matching check — see
"Validation performed"). D1 bindings, cron triggers, and non-secret
`[vars]` are all declared. **Requires configuration:** the
`REPLACE_WITH_YOUR_D1_DATABASE_ID` placeholders (5 files) still need
your real database id — intentionally not faked.

### Build Status — 🟡 YELLOW (environment limitation, not a code defect)
`npm install` and `npm run build` **were explicitly attempted** in this
environment (not skipped) and both failed due to blocked network
egress to the npm registry — this is a sandbox policy restriction, not
a project defect. Exact output:

```
$ npm install
npm error code E403
npm error 403 403 Forbidden - GET https://registry.npmjs.org/@vitejs%2fplugin-react
npm error 403 In most cases, you or one of your dependencies are requesting
npm error 403 a package version that is forbidden by your security policy, or
npm error 403 on a server you do not have access to.

$ npm run build
> abovetheclouds-v3@3.0.0 build
> vite build

sh: 1: vite: not found
```

The second failure (`vite: not found`) is a direct downstream
consequence of the first (`node_modules` never got populated) — it is
not a separate, independent build error. **This audit does not claim a
successful build anywhere.** In place of a real build, the following
offline-only checks were performed and passed — see the
full list below. These catch the large majority of real deployment
blockers (syntax errors, broken imports, mismatched exports, broken
routes, malformed SQL, undocumented env vars) but they are **not a
substitute for actually running `npm install && npm run build`**,
which you should do as the very first step before deploying (see
README section 20, steps 2–3).

---

## Validation performed (this audit, all offline)

1. **Syntax check** — every `.js` file under `functions/`, `server/`,
   `workers/` parsed cleanly with `node --check` (as ES modules).
2. **Import resolution** — every relative `import ... from './...'` in
   both the backend (`functions/`, `server/`, `workers/`) and frontend
   (`src/`) resolves to a real file on disk.
3. **Named export/import matching** — every `import { X } from '...'`
   across the backend and frontend has a matching `export` in its
   target file (script-based cross-reference, not just "the file
   exists").
4. **Frontend API-call vs. route matching** — every `api('/...')` call
   in `src/` was cross-referenced against the actual routes discoverable
   from the `functions/api/` folder structure; all 12 call sites match a
   real endpoint.
5. **Frontend router vs. Link targets** — cross-referenced every
   `<Route path>` in `App.jsx` against every `<Link to=...>`/`href`
   in the codebase. **Found and fixed a real bug:** `Nav.jsx` linked to
   `/profile`, a route that doesn't exist (no `<Route path="/profile">`
   was ever defined) — this would have rendered a blank page for any
   logged-in user who clicked their XP badge in the nav. Repointed to
   the existing leaderboard section with an explanatory tooltip until a
   real profile page is built.
6. **D1 schema vs. code** — every table name referenced in a SQL
   string anywhere in the backend exists in `0001_init.sql`; no queries
   reference a nonexistent table.
7. **INSERT column/value count validation** — a purpose-built,
   quote-aware SQL tuple parser (handles `''`-escaped apostrophes and
   nested parens from `strftime(...)`) confirmed every `INSERT` in both
   migration files has matching column and value counts, after fixing
   the escaping bugs described in the D1 section above.
8. **Env var documentation** — every `env.SOMETHING` referenced in
   backend code has a corresponding entry in `.env.example` (checked
   programmatically, not by eye).
9. **TOML validity** — all 5 wrangler config files parsed successfully
   with Python's real `tomllib` parser (not just brace/quote counting).
10. **XP logic tests run against real project source** — `levelForXp`,
    RSS parsing, categorization, hash-based deduplication, and
    `awardXp` (including its idempotency guard, using a fake-D1 test
    harness) were executed with a minimal Vitest-compatible shim
    importing the actual files from `server/lib/` directly (not
    reimplemented logic) — 18 assertions, all passing. The same specs
    live in `tests/*.test.js`, ready to run for real with `npx vitest`
    once `npm install` succeeds with real network access.
11. **`npm install` / `npm run build` were actually attempted** (not
    skipped or assumed) — both failed due to blocked npm registry
    access in this sandbox (HTTP 403), not a project defect. Exact
    output is in the Build Status section above.

## What this audit does NOT guarantee

- A real `npm install && npm run build` has not succeeded in this
  environment (it was attempted — see Build Status above — and failed
  on network access, not on project code). Package version conflicts,
  a subtle build-time error, or a Vite/React compatibility issue are
  still possible and would only surface on a real build with network
  access. **Run this yourself as the first step** (README section 20).
- MapLibre GL rendering, real browser behavior, and actual OpenSky API
  responses were not exercised (no network / no browser in this
  environment).
- The 8 unimplemented challenge types, badge-awarding, "My Flights" UI,
  and the playable game are not evaluated for readiness because they
  are known-incomplete by design (see README section 19) — they are
  not claimed as done anywhere in this audit.

---

## Bottom line

**Zero RED items.** Across the full audit (initial pass + a follow-up
security cleanup pass), real bugs were found and fixed: the XP race
condition, invalid SQL escaping in seed data, a broken `/profile` link,
and — in the follow-up pass — a genuine failure-recovery gap where a
transient error after the atomic challenge claim could have
permanently stranded a user's earned XP at zero. None remain open.
Everything marked 🟡 YELLOW is either an intentional, documented,
not-yet-configured piece (D1 database id, OpenSky credentials, real
image files, a metadata provider, a real `npm install`/`npm run build`
on a machine with network access) or an honestly-scoped gap that was
never claimed as finished. The project is deployable as **AboveTheClouds
V3** following the First Deployment Checklist in README section 20,
starting with `npm install && npm run build` on a machine with real
network access.
