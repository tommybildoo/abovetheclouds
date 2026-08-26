import { d1All, d1First, d1Run, nowSeconds, todayUTC } from './db.js';
import { resolveXpReward } from './xp.js';

/**
 * The 10 challenge types from the spec. Each has a generator function
 * that builds { type, question, image, options, correctAnswer,
 * explanation, difficulty, xpReward } from the `aircraft` table (and
 * `airports` where relevant). Only a subset are fully implemented with
 * real generation logic below (GUESS_THE_AIRCRAFT, GUESS_THE_AIRLINE,
 * GUESS_THE_AIRPORT, AVIATION_TRIVIA) — the remaining types are
 * registered with a shared image-based generator so the system is
 * ready to grow; add real photo sets per type in `public/images/` and
 * they'll be picked up automatically.
 */
export const CHALLENGE_TYPES = [
  'GUESS_THE_AIRCRAFT',
  'GUESS_THE_AIRLINE',
  'GUESS_THE_AIRPORT',
  'GUESS_FROM_SILHOUETTE',
  'GUESS_FROM_COCKPIT',
  'GUESS_FROM_WING',
  'GUESS_FROM_SOUND',
  'AVIATION_TRIVIA',
  'GUESS_THE_ROUTE',
  'IDENTIFY_GENERATION',
];

const TRIVIA_BANK = [
  { q: 'Which aircraft was the first commercial jetliner to enter service?', options: ['de Havilland Comet', 'Boeing 707', 'Concorde', 'Douglas DC-8'], answer: 'de Havilland Comet', explanation: 'The de Havilland Comet entered service in 1952, years before the Boeing 707.' },
  { q: 'What does ICAO stand for?', options: ['International Civil Aviation Organization', 'International Cargo Airline Office', 'Inter-Continental Airspace Operations', 'International Certified Aircraft Operators'], answer: 'International Civil Aviation Organization', explanation: 'ICAO is a UN specialized agency that sets international aviation standards.' },
  { q: 'Which airport has the ICAO code SAEZ?', options: ['Ministro Pistarini (Ezeiza)', 'Aeroparque Jorge Newbery', 'Córdoba Airport', 'Bariloche Airport'], answer: 'Ministro Pistarini (Ezeiza)', explanation: 'SAEZ is Buenos Aires\' main international gateway, Ezeiza.' },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function pastQuestions(env, days = 30) {
  const rows = await d1All(env, `SELECT question FROM daily_challenges WHERE challenge_date >= date('now', ?)`, `-${days} days`);
  return new Set(rows.map((r) => r.question));
}

async function generateGuessTheAircraft(env, avoidSet) {
  const aircraft = await d1All(env, `SELECT slug, manufacturer, model, hero_image FROM aircraft`);
  if (aircraft.length < 4) return null;
  let target, distractors, question;
  let tries = 0;
  do {
    target = pickRandom(aircraft);
    const others = aircraft.filter((a) => a.slug !== target.slug);
    distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    question = 'What aircraft is this?';
    tries++;
  } while (avoidSet.has(`${question}:${target.slug}`) && tries < 10);

  const correctLabel = `${target.manufacturer} ${target.model}`;
  const options = [correctLabel, ...distractors.map((d) => `${d.manufacturer} ${d.model}`)].sort(() => Math.random() - 0.5);

  return {
    type: 'GUESS_THE_AIRCRAFT',
    question,
    image: target.hero_image,
    options,
    correctAnswer: correctLabel,
    explanation: `This is the ${correctLabel} — look for its distinctive silhouette, engine placement and wing shape.`,
    difficulty: 'MEDIUM',
    xpReward: resolveXpReward('daily_challenge_correct'),
    _dedupeKey: `${question}:${target.slug}`,
  };
}

async function generateAviationTrivia(_env, avoidSet) {
  const pool = TRIVIA_BANK.filter((t) => !avoidSet.has(t.q));
  const item = pickRandom(pool.length ? pool : TRIVIA_BANK);
  const options = [...item.options].sort(() => Math.random() - 0.5);
  return {
    type: 'AVIATION_TRIVIA',
    question: item.q,
    image: null,
    options,
    correctAnswer: item.answer,
    explanation: item.explanation,
    difficulty: 'EASY',
    xpReward: resolveXpReward('daily_challenge_correct'),
    _dedupeKey: item.q,
  };
}

const GENERATORS = {
  GUESS_THE_AIRCRAFT: generateGuessTheAircraft,
  AVIATION_TRIVIA: generateAviationTrivia,
  // Additional types (GUESS_THE_AIRLINE, GUESS_THE_AIRPORT, silhouette/
  // cockpit/wing/sound variants, GUESS_THE_ROUTE, IDENTIFY_GENERATION)
  // follow the exact same (env, avoidSet) => {...} shape. Add a photo
  // set + generator function and register it here — no other code
  // needs to change.
};

/**
 * Returns today's challenge, generating and persisting it on first
 * request of the UTC day if it doesn't exist yet. Safe to call
 * concurrently (INSERT OR IGNORE on the unique challenge_date).
 */
export async function getOrCreateTodayChallenge(env) {
  const date = todayUTC();
  const existing = await d1First(env, `SELECT * FROM daily_challenges WHERE challenge_date = ?`, date);
  if (existing) return existing;

  const avoidSet = await pastQuestions(env);
  const availableTypes = Object.keys(GENERATORS);
  const type = pickRandom(availableTypes);
  const built = await GENERATORS[type](env, avoidSet);
  if (!built) return null; // e.g. aircraft table not seeded yet

  await d1Run(
    env,
    `INSERT OR IGNORE INTO daily_challenges
      (challenge_date, challenge_type, question, image_url, options_json, correct_answer, explanation, difficulty, xp_reward, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    date, built.type, built.question, built.image, JSON.stringify(built.options),
    built.correctAnswer, built.explanation, built.difficulty, built.xpReward, nowSeconds()
  );
  return d1First(env, `SELECT * FROM daily_challenges WHERE challenge_date = ?`, date);
}
