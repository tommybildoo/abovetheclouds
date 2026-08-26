# AboveTheClouds V3

**Aviation beyond the ordinary.**

An interactive aviation platform: live flight tracking, daily aviation
challenges with XP and streaks, an aircraft encyclopedia, auto-ingested
aviation news, an Argentina-focused aviation identity, and the
foundations for a community and future products.

This is a **real, runnable full-stack project** — not a mockup. Some
features (auth, XP, daily challenges, live map with demo mode) work
immediately with zero configuration. Others (real live flight data,
real news sources) need you to add credentials/URLs, which this README
walks through.

---

## 1. What this project is

- A **React** single-page app (built with Vite) for the frontend.
- **Cloudflare Pages Functions** (`functions/`) for the API — these run
  on the same Workers runtime as Cloudflare Workers, so "backend code"
  works, unlike the old GitHub Pages setup.
- **Cloudflare D1** (SQLite at the edge) for all relational data.
- **Standalone Cloudflare Workers** (`workers/cron/`) for scheduled jobs
  (news ingestion, daily challenge generation, live flight cache
  refresh, database cleanup) — Pages Functions can't run on a cron
  trigger themselves, so these are deployed separately.
- **MapLibre GL JS** for the live aircraft map, with a custom
  AboveTheClouds marker (not an emoji).

### Why we moved off GitHub Pages

GitHub Pages only serves static files — it cannot run server-side code,
call external APIs with secret credentials, or query a database. V3
needs all three (a flight-data provider that requires OAuth secrets,
a database for XP/challenges/news, and scheduled background jobs), so
the app is now a **Cloudflare Pages** site: static frontend + Pages
Functions API + D1 database, all on Cloudflare, which already manages
your DNS for `abovetheclouds.club`.

---

## 2. Folder structure

```
src/                  React frontend
  components/         Nav, Footer, Hero, Toast
  features/           one folder per feature (live-flights, challenges,
                       news, aircraft, airports, argentina, spotter,
                       game, community, leaderboard, auth, admin)
  pages/               top-level routed pages (Home, Admin)
  lib/                 frontend-safe config + API client

functions/api/         Cloudflare Pages Functions = your backend API
  flights/ aircraft/ airports/ news/ challenge/ leaderboard/ auth/ photos/ admin/

server/lib/            shared server-side logic, imported by both
                       functions/ and workers/
  flightProviders/     FlightDataProvider abstraction (demo + OpenSky)
  news/                RSS parsing + categorization
  xp.js                XP/level/streak logic (server-authoritative)
  auth.js              password hashing, sessions
  challenges.js         daily challenge generation

workers/cron/          standalone Workers, each deployed separately,
                       triggered on a schedule (see step 6 below)

database/migrations/   SQL files — run these against D1 to set up tables
  0001_init.sql         schema
  0002_seed.sql          starter aircraft, airports, news sources

public/images/         drop real photos here (see public/images/README.md)
tests/                 Vitest unit tests (XP, news dedupe, categorization)
```

---

## 3. Local development

You'll need [Node.js](https://nodejs.org) 18+ and a free
[Cloudflare account](https://dash.cloudflare.com/sign-up).

```bash
npm install
npm run db:migrate:local        # creates local D1 tables
npm run build
npm run pages:dev               # serves the built site + functions locally, with D1
```

`pages:dev` runs at `http://127.0.0.1:8788` by default. In a second
terminal you can also run `npm run dev` for Vite's hot-reload dev server
(it proxies `/api/*` to the address above — see `vite.config.js`).

The site works immediately in **demo mode** — no API keys needed to see
the map, aircraft pages, and UI. The Daily Challenge and Leaderboard
need at least one signed-up user and a seeded `aircraft` table (already
included via `0002_seed.sql`).

---

## 4. Cloudflare setup (production)

```bash
npm install -g wrangler
wrangler login
```

1. **Create the Pages project:**
   ```bash
   wrangler pages project create abovetheclouds
   ```
2. **Create the D1 database:**
   ```bash
   wrangler d1 create abovetheclouds
   ```
   Copy the `database_id` it prints into `wrangler.toml` under
   `[[d1_databases]]`.
3. **Run migrations against the real database:**
   ```bash
   npm run db:migrate:remote
   wrangler d1 execute abovetheclouds --remote --file=database/migrations/0002_seed.sql
   ```
4. **Point your domain:** in the Cloudflare dashboard, go to your Pages
   project → Custom Domains → add `abovetheclouds.club`. Since
   Cloudflare already manages your DNS, this is a couple of clicks —
   no registrar changes needed.
5. **Deploy:**
   ```bash
   npm run pages:deploy
   ```

---

## 5. D1 setup — summary

All tables are defined in `database/migrations/0001_init.sql` (18
tables: users, sessions, profiles, aircraft, airports, flights_cache,
flight_snapshots, news_sources, news_articles, daily_challenges,
challenge_attempts, xp_transactions, badges, user_badges, saved_flights,
photos, settings). Re-running the file is safe — every statement uses
`IF NOT EXISTS` / `OR IGNORE`.

To add more data later, either edit `0002_seed.sql` and re-run it, or
use `wrangler d1 execute abovetheclouds --remote --command "INSERT INTO ..."`.

---

## 6. Environment variables & secrets

Copy `.env.example` to `.env` for local dev. For production, set each
one as a Cloudflare Pages **secret** (never commit real secrets):

```bash
wrangler pages secret put FLIGHT_DATA_PROVIDER    # "demo" or "opensky"
wrangler pages secret put FLIGHT_API_CLIENT_ID
wrangler pages secret put FLIGHT_API_CLIENT_SECRET
wrangler pages secret put ADMIN_TOKEN             # long random string, e.g. `openssl rand -hex 32`
```

**The site works with none of these set** — it falls back to demo mode
automatically (see `server/lib/flightProviders/index.js`).

---

## 7. Flight API setup (OpenSky)

1. Create a free account at https://opensky-network.org
2. Register an OAuth2 client under your account settings to get a
   **Client ID** and **Client Secret**.
3. Set:
   ```
   FLIGHT_DATA_PROVIDER=opensky
   FLIGHT_API_CLIENT_ID=...
   FLIGHT_API_CLIENT_SECRET=...
   ```
4. Deploy the flight-cache-refresh worker (step 9) so the map doesn't
   call OpenSky on every visitor request.

**Never** put these values in `src/` or any frontend file — only in
Cloudflare secrets, read by `functions/` and `workers/`.

Want a different provider (ADS-B Exchange, FlightAware, etc.)? Add a
new class implementing `FlightDataProvider` (see
`server/lib/flightProviders/FlightDataProvider.js`) and register it in
`server/lib/flightProviders/index.js`. Nothing else in the app needs to
change.

### Aircraft metadata (type, registration, airline, route) — separate from live position

OpenSky's live position feed (`/states/all`) does **not** reliably
include aircraft type, registration, airline, origin, or destination —
only real-time lat/lon/altitude/speed/heading/callsign. Rather than
guessing those fields, V3 keeps them as an explicitly separate,
optional concern:

- `server/lib/metadataProviders/AircraftMetadataProvider.js` — the
  abstraction (`getAircraftMetadata`, `getAircraftMetadataBatch`).
- `server/lib/metadataProviders/NullMetadataProvider.js` — the default;
  returns `null` for every field, honestly.
- `server/lib/flightEnrichment.js` — merges metadata onto live flights
  (used by both `/api/flights/live` and the flight-cache-refresh
  worker), and only ever *fills a gap*, never overwrites data the
  flight-data provider itself reported.

With no metadata provider configured (the default), the UI shows
"Aircraft Type: Unknown", "—" for registration/airline/origin/
destination, and explains why — see
`src/features/live-flights/AircraftDetailPanel.jsx`. **No paid metadata
provider is integrated in this version** — the interface just makes it
a clean drop-in later: implement a class, add its env vars to
`.env.example`, register it in `server/lib/metadataProviders/index.js`
behind `AIRCRAFT_METADATA_PROVIDER=<your-id>`. Nothing else changes.

### Flight refresh & rate limits (performance notes)

- Normal page loads **never** call OpenSky directly — they read
  `flights_cache` in D1, refreshed on its own schedule by
  `workers/cron/flight-cache-refresh.js` (default every 1 minute; tune
  this to your actual OpenSky tier's rate limit — anonymous access is
  far more restricted than authenticated).
- The only time `/api/flights/live` calls the provider directly is a
  cold start (cache empty/stale, e.g. right after first deploy). On
  that path, it pushes a bounding box down to the provider instead of
  fetching the whole world:
  1. an explicit map-viewport bbox (`minLat`/`maxLat`/`minLon`/`maxLon`
     query params) takes priority,
  2. otherwise `argentina=1` scopes the request to `ARGENTINA_BBOX`
     (see `server/lib/geo.js`),
  3. only a fully unscoped request fetches the whole world.
- Reading from the cache is also bbox-scoped at the SQL level when a
  region is known, so an "Argentina Mode" request never pulls a large
  global cache table into memory just to filter most of it away in JS.

---

## 8. News RSS setup

Sources live in the `news_sources` table (seeded with a few examples in
`0002_seed.sql`, some disabled by default — verify each feed URL is
still valid and permitted before enabling it). To add one:

```sql
INSERT INTO news_sources (name, url, type, enabled, category)
VALUES ('Some Aviation Blog', 'https://example.com/feed.xml', 'rss', 1, 'AUTO');
```

Run that with `wrangler d1 execute abovetheclouds --remote --command "..."`,
or build a tiny admin UI on top of `/api/admin/dashboard` later.

`category = 'AUTO'` lets the keyword categorizer
(`server/lib/news/categorize.js`) decide; set an explicit category to
override it for a given source.

---

## 9. Deploying the scheduled jobs (cron workers)

Each file in `workers/cron/` is deployed as its **own standalone
Worker**, with its **own `wrangler.toml`-style config file**
(`<name>.wrangler.toml`, sitting right next to the worker's `.js` file)
that declares its D1 binding and cron trigger. This is the cleanest
Cloudflare-supported way to give several independent Workers access to
the same D1 database without conflating them with the Pages project's
own `wrangler.toml`.

**Before deploying, edit each of these 4 files** and replace
`REPLACE_WITH_YOUR_D1_DATABASE_ID` with the real database id from
`wrangler d1 create abovetheclouds` (the same id you put in the root
`wrangler.toml`):

```
workers/cron/news-ingest.wrangler.toml
workers/cron/daily-challenge.wrangler.toml
workers/cron/flight-cache-refresh.wrangler.toml
workers/cron/db-cleanup.wrangler.toml
```

Then deploy each one (the `--config` flag points wrangler at that
worker's own file instead of the root Pages config):

```bash
wrangler deploy --config workers/cron/news-ingest.wrangler.toml
wrangler deploy --config workers/cron/daily-challenge.wrangler.toml
wrangler deploy --config workers/cron/flight-cache-refresh.wrangler.toml
wrangler deploy --config workers/cron/db-cleanup.wrangler.toml
```

Or with the `package.json` shortcuts:

```bash
npm run worker:news:deploy
npm run worker:challenge:deploy
npm run worker:flights:deploy
npm run worker:cleanup:deploy
# or all four at once:
npm run workers:deploy:all
```

The cron trigger and schedule are already declared inside each
`.wrangler.toml` file's `[triggers]` section — `wrangler deploy` picks
them up automatically, no separate `wrangler triggers deploy` step
needed:

| Worker | Config file | Schedule |
|---|---|---|
| News ingestion | `news-ingest.wrangler.toml` | every 20 min |
| Daily challenge | `daily-challenge.wrangler.toml` | `5 0 * * *` (00:05 UTC) |
| Flight cache refresh | `flight-cache-refresh.wrangler.toml` | every 1 min (no-op in demo mode) |
| DB cleanup | `db-cleanup.wrangler.toml` | `30 3 * * *` |

Each worker also has a `fetch` handler, so you can trigger it manually
by visiting its `*.workers.dev` URL — handy for testing before the
first scheduled run kicks in.

If a live flight provider needs secrets (OpenSky credentials), set them
on the `flight-cache-refresh` worker specifically, since that's the one
that calls the provider:

```bash
wrangler secret put FLIGHT_API_CLIENT_ID --config workers/cron/flight-cache-refresh.wrangler.toml
wrangler secret put FLIGHT_API_CLIENT_SECRET --config workers/cron/flight-cache-refresh.wrangler.toml
```

---

## 10. How to add an aircraft

Add a row to the `aircraft` table (edit `0002_seed.sql` and re-run it,
or run an `INSERT` directly). Fields: `slug, manufacturer, model,
family, first_flight, length_m, wingspan_m, height_m, cruise_speed,
range_km, typical_capacity, engines, mtow_kg, why_fans_love_it,
hero_image`. It will automatically appear in `/aircraft`, get its own
`/aircraft/:slug` page, and become eligible for GUESS_THE_AIRCRAFT
daily challenges — no code changes needed.

## 11. How to add an airport

Same idea — add a row to `airports`. Set `is_argentina = 1` to have it
show up in the "Argentina From Above" section and Argentina Mode
filtering on the live map.

## 12. How to add a news source

See section 8 above.

## 13. How to modify Daily Challenges

Challenge *types* and their generator functions live in
`server/lib/challenges.js` (`GENERATORS` object). Two types are fully
implemented (`GUESS_THE_AIRCRAFT`, `AVIATION_TRIVIA`); the other eight
from the spec (airline/airport/silhouette/cockpit/wing/sound/route/
generation) are documented with the exact same function shape
`(env, avoidSet) => ({...})` — copy `generateAviationTrivia` as a
template, register it in `GENERATORS`, and it's live. To edit the
trivia question bank, edit the `TRIVIA_BANK` array in the same file.

## 14. How to add images

See `public/images/README.md` — drop a file at the path referenced by
`hero_image` (or the relevant field) in the database, no code changes
needed.

---

## 15. API reference

| Endpoint | Method | Notes |
|---|---|---|
| `/api/flights/live` | GET | Cached live/demo flights. Query: `category`, `argentina=1`, bbox params |
| `/api/flights/:id` | GET | Single aircraft by icao24 |
| `/api/flights/search?q=` | GET | Search cached flights by callsign/registration/icao24 |
| `/api/aircraft` | GET | All aircraft |
| `/api/aircraft/:slug` | GET | One aircraft profile |
| `/api/airports?argentina=1` | GET | All airports, optionally Argentina-only |
| `/api/airports/:icao` | GET | One airport |
| `/api/news?category=&limit=` | GET | Ingested news articles |
| `/api/challenge/today` | GET | Today's challenge (answer withheld) |
| `/api/challenge/answer` | POST | `{challengeId, answer}` — requires session cookie |
| `/api/leaderboard?period=` | GET | `today` \| `weekly` \| `monthly` \| `alltime` |
| `/api/auth/signup` / `/login` / `/me` | POST/POST/GET | Session-cookie auth |
| `/api/photos` | GET/POST | Approved photos / submit for moderation |
| `/api/admin/dashboard` | GET | Requires `X-Admin-Token` header |

---

## 16. Security notes

- Passwords are hashed with PBKDF2-SHA256 (100k iterations, random salt
  per user) via the Workers-native Web Crypto API — see `server/lib/auth.js`.
  Plaintext passwords are never stored.
- XP is **only** ever awarded server-side from a fixed table of reasons
  (`server/lib/xp.js` → `XP_REWARDS`) — `awardXp()` has no parameter of
  any kind for a caller-supplied amount, so it is not possible for any
  code path to award anything other than one of the pre-approved
  amounts.
- `awardXp()` is idempotent per `(user, reason, referenceId)` — calling
  it again for the same challenge/event is a safe no-op rather than a
  double-award. This is what makes `/api/challenge/answer` safe to
  retry after a partial failure (e.g. a transient D1 error right after
  the challenge is claimed) without either losing the user's earned XP
  or crediting it twice.
- `challenge_attempts` has a `UNIQUE(user_id, challenge_id)` constraint,
  so replaying the answer request cannot farm XP — the `INSERT` into
  this table is the atomic "claim" step, evaluated before any reward is
  granted.
- The leaderboard is always computed from the `xp_transactions` ledger —
  there is no endpoint that lets the frontend submit a score directly.
- All D1 queries use parameter binding (`?` placeholders), never string
  concatenation, to prevent SQL injection.
- `/api/admin/*` requires a shared secret (`ADMIN_TOKEN`) for this first
  version — swap for real role-based sessions before opening admin
  access to more than yourself.

---

## 17. Data honesty (read this before demoing the site)

- The live map is **DemoFlightProvider** by default — clearly labeled
  `DEMO MODE` in the UI, with synthetic aircraft that drift smoothly.
  It is never presented as real traffic.
- Configuring `FLIGHT_DATA_PROVIDER=opensky` with valid credentials
  switches the whole app to `isLive: true`, shown as a `LIVE` badge with
  "Updated Xs ago".
- If the live provider fails, the UI shows "Live data temporarily
  unavailable" — it never fabricates a position.
- News articles are only ever what the ingestion job actually parsed
  from a real feed — nothing is hardcoded into the homepage.

---

## 18. Testing

```bash
npm install
npm test
```

Tests cover XP calculation/level thresholds, RSS parsing, news
deduplication/categorization, and server-authoritative XP awarding
(`tests/*.test.js`, using Vitest). A dependency-free manual smoke test
was also used during development — see the test files for the same
assertions expressed as Vitest specs.

---

## 19. What's fully built vs. architected-but-stubbed

**Fully working today:**
What's Flying Now (demo + OpenSky provider, map, filters, Argentina
mode, detail panel, bbox pushed to the provider on cache-miss), Daily
Challenge (2 of 10 types — GUESS_THE_AIRCRAFT and AVIATION_TRIVIA —
fully implemented; server-validated XP/streaks with an atomic
claim-then-award flow, so it works correctly even under concurrent
requests), News ingestion (RSS → dedupe → categorize → publish),
Aircraft Explorer + SEO pages, Argentina From Above, auth (signup/login/
sessions), Leaderboard, Community photo submission + moderation status,
Admin dashboard (counts).

**Daily Challenge does not require the cron worker to function.**
`/api/challenge/today` calls `getOrCreateTodayChallenge()` directly and
creates the challenge on first request of the UTC day if it doesn't
exist yet (safe under concurrent requests via the `UNIQUE` constraint on
`challenge_date`). `workers/cron/daily-challenge.js` is purely a
convenience pre-warm so the very first visitor of the day doesn't pay
the generation cost — deploying it is optional, not required.

> **⚠️ BADGES ARE NOT YET FULLY CONNECTED.** The `badges` and
> `user_badges` tables exist and are seeded with the 7 badges from the
> spec, but nothing in `/api/challenge/answer` (or anywhere else) checks
> a user's stats and awards them yet. Do not present badges as a working
> feature until that logic is added — see section 19 below for the
> shape it should take.

**Architecture in place, needs follow-up work:**
The remaining 8 challenge types (same function shape, just need content),
badge-awarding logic (schema + badge list exist; the "check stats after
each answer and INSERT into user_badges if newly earned" step is not
wired into `/api/challenge/answer` yet — a natural next step would be a
small `server/lib/badges.js` with a `checkAndAwardBadges(env, userId)`
function called at the end of a correct answer), the playable landing
mini-game (hub UI is real, no 3D gameplay), "My Flights" (schema ready,
no UI yet), admin CRUD screens for news/aircraft/airports (currently
edited via SQL — see sections 10–12), and aircraft-metadata enrichment
(the `AircraftMetadataProvider` interface exists and is wired into both
the live endpoint and the refresh worker, but no real provider is
plugged in — every flight's type/registration/airline/route stays
"Unknown"/"—" until one is added; see section on AircraftMetadataProvider
below).

---

---

## 20. First Deployment Checklist

A simple, in-order checklist for the very first real deployment. Each
step says what to do and why, in plain language.

1. **Install Node.js.** Download the LTS version from
   [nodejs.org](https://nodejs.org) (18 or newer). This gives you `npm`,
   which everything else below depends on.
2. **`npm install`** — run this in the project folder. It downloads all
   the libraries the project uses (React, MapLibre, Wrangler, etc.)
   into a `node_modules/` folder. You only need to do this once (and
   again any time `package.json` changes).
3. **`npm run build`** — compiles the React frontend into a `dist/`
   folder of plain HTML/CSS/JS that Cloudflare Pages can serve. Run
   this again any time you change frontend code before deploying.
4. **Create the Cloudflare D1 database** — `wrangler d1 create
   abovetheclouds`. D1 is Cloudflare's database; this creates an empty
   one and prints a `database_id` you'll need in the next step.
5. **Apply migrations** — `npm run db:migrate:remote` (schema) then
   `wrangler d1 execute abovetheclouds --remote --file=database/migrations/0002_seed.sql`
   (starter aircraft/airports/news sources). This actually creates the
   tables and fills in the starter data.
6. **Update the D1 database ID** — paste the `database_id` from step 4
   into `wrangler.toml` (root) AND into all 4 files in
   `workers/cron/*.wrangler.toml` — every one of them must point at the
   same database.
7. **Configure the Pages D1 binding** — this is what step 6 does; the
   `[[d1_databases]]` block in `wrangler.toml` is how the Pages
   Functions API (`functions/`) gets access to your database at
   runtime, under the name `env.DB`.
8. **Configure cron Worker D1 bindings** — same idea, but each
   standalone worker in `workers/cron/` needs its own binding because
   they're deployed separately from Pages (see section 9). Already done
   if you completed step 6.
9. **Deploy Pages** — `npm run pages:deploy`. This uploads the built
   `dist/` folder plus the `functions/` API to Cloudflare and gives you
   a live URL.
10. **Deploy cron Workers** — `npm run workers:deploy:all` (or one at a
    time — see section 9). These run the background jobs (news
    ingestion, daily challenge pre-warm, flight cache refresh, cleanup)
    on their own schedules, independent of any visitor's page load.
11. **Configure secrets** — for anything you want live rather than
    demo/default: `wrangler pages secret put ADMIN_TOKEN`, and (if
    you're using OpenSky) `FLIGHT_DATA_PROVIDER`,
    `FLIGHT_API_CLIENT_ID`, `FLIGHT_API_CLIENT_SECRET` — both on the
    Pages project AND on the `flight-cache-refresh` worker. Skipping
    this is fine — the site works in demo mode with zero secrets set.
12. **Test `/api/flights/live`** — visit `https://<your-site>/api/flights/live`
    directly in a browser. You should see JSON with `"provider":"demo"`
    (until you configure OpenSky) and a `flights` array — this confirms
    D1 and the Pages Functions are wired up correctly.
13. **Test Daily Challenge** — open the site, scroll to Daily Challenge.
    It should load a question (auto-generated on first visit of the
    day). Sign up for an account and answer it — you should see XP
    awarded and a streak counter.
14. **Test news ingestion** — either wait for the `news-ingest` cron to
    run, or trigger it manually by visiting its `*.workers.dev` URL
    directly (its `fetch` handler runs the same ingestion logic). Then
    check `/api/news` for articles.
15. **Verify HTTPS/domain** — in the Cloudflare dashboard, confirm
    `abovetheclouds.club` shows as an active Custom Domain on your
    Pages project with a valid SSL certificate (Cloudflare provisions
    this automatically, usually within minutes).

---

Built as **AboveTheClouds** — for people who never stop looking up.
