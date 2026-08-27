-- ============================================================
-- AboveTheClouds V4 — country personalization
-- Apply AFTER 0001_init.sql and 0002_seed.sql:
--   wrangler d1 execute abovetheclouds --local --persist-to=.wrangler/state --file=database/migrations/0003_v4_country.sql
--
-- Purely additive: no existing column, table, or constraint is
-- removed or changed. Existing rows/behavior (e.g. is_argentina,
-- argentina=1 query params) keep working exactly as before.
-- ============================================================

-- Users can set "their" country (from the first-visit selector, or
-- profile settings later). NULL = not chosen yet / no personalization.
ALTER TABLE profiles ADD COLUMN country_code TEXT;

-- V4 Profile page needs an "airports discovered" count (spec section
-- 7). No column for this existed — rather than fabricate a number in
-- the UI, add it here, server-authoritative like aircraft_identified.
-- Nothing currently increments it automatically (no feature yet marks
-- "you've seen this airport") — it starts at 0 and is a real, honest
-- value rather than invented data; wiring up what increments it is a
-- documented follow-up, not implemented in this pass.
ALTER TABLE profiles ADD COLUMN airports_discovered INTEGER NOT NULL DEFAULT 0;

-- Backfill: airports already flagged is_argentina=1 get country_code='AR'
-- so the new generalized ?country= filter and the legacy ?argentina=1
-- filter both return the same rows.
ALTER TABLE airports ADD COLUMN country_code TEXT;
UPDATE airports SET country_code = 'AR' WHERE is_argentina = 1;
UPDATE airports SET country_code = 'US' WHERE country = 'United States' AND country_code IS NULL;
UPDATE airports SET country_code = 'GB' WHERE country = 'United Kingdom' AND country_code IS NULL;
UPDATE airports SET country_code = 'ES' WHERE country = 'Spain' AND country_code IS NULL;
UPDATE airports SET country_code = 'AE' WHERE country = 'United Arab Emirates' AND country_code IS NULL;

-- Daily challenges gain a country_code column for personalization
-- flavor (e.g. "today's challenge leans toward Argentina" when a
-- country-aware generator is picked). IMPORTANT LIMITATION, stated
-- honestly: daily_challenges.challenge_date already has a column-level
-- UNIQUE constraint from 0001_init.sql, which SQLite cannot alter
-- without rebuilding the table. That means this migration does NOT
-- enable a separate challenge per country per day — there is still
-- exactly ONE daily challenge shared by everyone, same as V3. Adding
-- genuinely distinct per-country daily challenges would require a
-- table rebuild (a bigger, riskier migration) and is left as a
-- documented follow-up rather than attempted here. country_code on
-- this table records which country (if any) THIS DAY's single
-- challenge happens to be about.
ALTER TABLE daily_challenges ADD COLUMN country_code TEXT NOT NULL DEFAULT 'GLOBAL';
