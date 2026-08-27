import { describe, it, expect } from 'vitest';
import { levelForXp, LEVELS } from '../server/lib/xp.js';

describe('levelForXp', () => {
  it('starts new users at level 1 (Passenger)', () => {
    const r = levelForXp(0);
    expect(r.level).toBe(1);
    expect(r.name).toBe('Passenger');
  });

  it('promotes to level 2 (Spotter) at exactly 1000 XP', () => {
    const r = levelForXp(1000);
    expect(r.level).toBe(2);
    expect(r.name).toBe('Spotter');
  });

  it('does not promote just below a threshold', () => {
    const r = levelForXp(999);
    expect(r.level).toBe(1);
  });

  it('caps progress at 1 for the max level', () => {
    const maxLevel = LEVELS[LEVELS.length - 1];
    const r = levelForXp(maxLevel.minXp + 999999);
    expect(r.nextLevelXp).toBeNull();
    expect(r.progress).toBe(1);
  });

  it('computes a fractional progress toward the next level', () => {
    const r = levelForXp(3000); // between Spotter(1000) and Aviation Enthusiast(5000)
    expect(r.progress).toBeCloseTo((3000 - 1000) / (5000 - 1000));
  });
});
