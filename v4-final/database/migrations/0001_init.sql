-- ============================================================
-- AboveTheClouds V3 — Initial D1 schema
-- Apply with: wrangler d1 execute abovetheclouds --file=database/migrations/0001_init.sql
-- All timestamps are stored as UTC ISO-8601 strings or unix epoch (INTEGER, seconds).
-- ============================================================

-- ---------- USERS & PROFILES ----------
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- uuid
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- PBKDF2 hash (see server/lib/auth.js), never plaintext
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_challenge_date TEXT,            -- YYYY-MM-DD (UTC) of last completed daily challenge
  challenges_completed INTEGER NOT NULL DEFAULT 0,
  aircraft_identified INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- ---------- AIRCRAFT ----------
CREATE TABLE IF NOT EXISTS aircraft (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,           -- e.g. boeing-757
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  family TEXT NOT NULL,                -- Narrowbody / Widebody / Regional Jet
  first_flight TEXT,
  length_m REAL,
  wingspan_m REAL,
  height_m REAL,
  cruise_speed TEXT,
  range_km INTEGER,
  typical_capacity INTEGER,
  engines TEXT,
  mtow_kg INTEGER,
  why_fans_love_it TEXT,
  hero_image TEXT,
  created_at INTEGER NOT NULL
);

-- ---------- AIRPORTS ----------
CREATE TABLE IF NOT EXISTS airports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icao TEXT UNIQUE NOT NULL,
  iata TEXT,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  latitude REAL,
  longitude REAL,
  elevation_ft INTEGER,
  runways INTEGER,
  spotting_notes TEXT,
  hero_image TEXT,
  is_argentina INTEGER NOT NULL DEFAULT 0, -- 1/0 flag, used for "Argentina Mode"
  created_at INTEGER NOT NULL
);

-- ---------- FLIGHTS (live cache, not historical truth) ----------
-- Populated/refreshed server-side from the configured FlightDataProvider.
-- This table is a CACHE, not permanent history — see flight_snapshots for that.
CREATE TABLE IF NOT EXISTS flights_cache (
  icao24 TEXT PRIMARY KEY,             -- unique aircraft transponder id from provider
  callsign TEXT,
  registration TEXT,
  aircraft_type TEXT,
  airline TEXT,
  origin_icao TEXT,
  destination_icao TEXT,
  latitude REAL,
  longitude REAL,
  altitude_ft INTEGER,
  ground_speed_kt INTEGER,
  heading_deg INTEGER,
  category TEXT,                       -- PASSENGER / CARGO / MILITARY / GENERAL_AVIATION / UNKNOWN
  status TEXT,                         -- IN_FLIGHT / LANDED / SCHEDULED
  provider TEXT NOT NULL,              -- e.g. 'opensky', 'demo'
  updated_at INTEGER NOT NULL          -- unix seconds — used to compute "updated Xs ago" and staleness
);

-- Optional historical snapshots for trails/analytics (kept small, pruned by cron job)
CREATE TABLE IF NOT EXISTS flight_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icao24 TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  altitude_ft INTEGER,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshots_icao24 ON flight_snapshots(icao24, recorded_at);

-- ---------- NEWS ----------
CREATE TABLE IF NOT EXISTS news_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'rss',    -- 'rss' | 'api'
  enabled INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'INDUSTRY'
);

CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  image_url TEXT,
  summary TEXT,                        -- short, in our own words — never a full copied article
  category TEXT NOT NULL DEFAULT 'INDUSTRY',
  guid TEXT UNIQUE NOT NULL,           -- dedupe key (feed guid, or hash of url+title)
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news_articles(category);

-- ---------- DAILY CHALLENGES ----------
CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date TEXT UNIQUE NOT NULL, -- YYYY-MM-DD, UTC
  challenge_type TEXT NOT NULL,        -- GUESS_THE_AIRCRAFT | GUESS_THE_AIRLINE | ... (10 types, see server/lib)
  question TEXT NOT NULL,
  image_url TEXT,
  options_json TEXT NOT NULL,          -- JSON array of option strings
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM',
  xp_reward INTEGER NOT NULL DEFAULT 850,
  created_at INTEGER NOT NULL
);

-- One row per user per day — prevents re-answering / XP farming.
CREATE TABLE IF NOT EXISTS challenge_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id),
  answer_given TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  attempted_at INTEGER NOT NULL,
  UNIQUE(user_id, challenge_id)
);

-- ---------- XP LEDGER (source of truth — profiles.xp is a derived cache) ----------
CREATE TABLE IF NOT EXISTS xp_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,                -- 'daily_challenge' | 'first_of_day' | 'streak_7' | 'streak_weekly_perfect' | ...
  reference_id TEXT,                   -- e.g. challenge_id
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_xp_user_time ON xp_transactions(user_id, created_at);

-- ---------- BADGES ----------
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,                 -- slug, e.g. 'first-flight'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  awarded_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);

-- ---------- SAVED FLIGHTS ("My Flights") ----------
CREATE TABLE IF NOT EXISTS saved_flights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flight_number TEXT,
  flight_date TEXT,
  aircraft_type TEXT,
  origin TEXT,
  destination TEXT,
  created_at INTEGER NOT NULL
);

-- ---------- COMMUNITY PHOTOS ----------
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  username TEXT NOT NULL,              -- denormalized display name at submission time
  image_url TEXT NOT NULL,
  aircraft TEXT,
  airport TEXT,
  location TEXT,
  caption TEXT,
  taken_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status, created_at DESC);

-- ---------- SETTINGS (key/value, used by admin panel) ----------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed a couple of sensible defaults
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('flight_refresh_interval_seconds', '20', strftime('%s','now')),
  ('news_ingest_enabled', '1', strftime('%s','now'));

INSERT OR IGNORE INTO badges (id, name, description, icon) VALUES
  ('first-flight', 'First Flight', 'Complete your first daily challenge.', 'plane'),
  ('weekend-spotter', 'Weekend Spotter', 'Complete 3 challenges.', 'binoculars'),
  ('streak-7', '7 Day Streak', 'Complete 7 consecutive daily challenges.', 'flame'),
  ('aircraft-geek', 'Aircraft Geek', 'Correctly identify 50 aircraft.', 'radar'),
  ('jet-age', 'Jet Age', 'Correctly identify 100 aircraft.', 'jet'),
  ('above-the-clouds', 'Above The Clouds', 'Reach 50,000 XP.', 'cloud'),
  ('argentina-spotter', 'Argentina Spotter', 'Complete 5 Argentina-related challenges.', 'flag-ar');
