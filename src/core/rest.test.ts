import { describe, expect, it } from 'vitest';
import { DEFAULT_COEFFICIENTS, planSets } from './program';
import { REST_MAX_SEC, REST_MIN_SEC, restAfterSet, restPlan, setIntensity } from './rest';

describe('restAfterSet', () => {
  it('scales with reps and closeness to max', () => {
    // 36 reps at max 45 (80%): 90 + 5 × 0.64 × (45 − 25) = 154 → 155
    expect(restAfterSet(36, 45, 0)).toBe(155);
    // Same reps for a stronger athlete is an easier set and needs less rest
    expect(restAfterSet(36, 90, 0)).toBeLessThan(restAfterSet(36, 45, 0));
    // A bigger set at the same intensity needs more rest
    expect(restAfterSet(52, 65, 0)).toBeGreaterThan(restAfterSet(36, 45, 0));
  });

  it('keeps the minimum for a max up to 25', () => {
    expect(restAfterSet(20, 25, 0)).toBe(REST_MIN_SEC);
    expect(restAfterSet(8, 10, 3)).toBe(REST_MIN_SEC);
  });

  it('adds accumulated fatigue for later sets', () => {
    expect(restAfterSet(25, 45, 3)).toBeGreaterThan(restAfterSet(25, 45, 0));
  });

  it('stays within 1:30–5:00 and rounds to 5 s', () => {
    expect(restAfterSet(120, 125, 0)).toBe(REST_MAX_SEC);
    for (let reps = 1; reps <= 150; reps++) {
      const r = restAfterSet(reps, 125, 2);
      expect(r % 5).toBe(0);
      expect(r).toBeGreaterThanOrEqual(REST_MIN_SEC);
      expect(r).toBeLessThanOrEqual(REST_MAX_SEC);
    }
  });

  it('treats reps above max as a max effort', () => {
    expect(setIntensity(30, 20)).toBe(1);
  });
});

describe('restPlan', () => {
  it('has one rest per gap between sets, shrinking as sets get easier', () => {
    const planned = planSets(65, DEFAULT_COEFFICIENTS.C);
    const plan = restPlan(planned, 65);
    expect(plan).toHaveLength(planned.length - 1);
    expect([...plan].sort((a, b) => b - a)).toEqual(plan);
  });

  it('gives beginners the minimum and strong athletes up to 5 minutes', () => {
    expect(restPlan(planSets(20, DEFAULT_COEFFICIENTS.C), 20).every((r) => r === REST_MIN_SEC)).toBe(true);
    expect(Math.max(...restPlan(planSets(35, DEFAULT_COEFFICIENTS.A), 35))).toBe(120);
    expect(Math.max(...restPlan(planSets(105, DEFAULT_COEFFICIENTS.C), 105))).toBe(REST_MAX_SEC);
  });
});
