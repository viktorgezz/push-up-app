import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COEFFICIENTS,
  completeMaxTest,
  completeTraining,
  initialState,
  isRecoveryDay,
  nextInSequence,
  planFor,
  planSets,
  recommendedNextDay,
} from './program';

const NOW = new Date(2026, 9, 18, 10, 0).getTime();

describe('planSets', () => {
  it('matches the spec example for M = 20', () => {
    expect(planSets(20, DEFAULT_COEFFICIENTS.A)).toEqual([15, 13, 11, 9, 8]);
    expect(planSets(20, DEFAULT_COEFFICIENTS.B)).toEqual([16, 14, 12, 10, 9]);
    expect(planSets(20, DEFAULT_COEFFICIENTS.C)).toEqual([17, 15, 13, 11, 10]);
  });

  it('never plans fewer than 1 rep', () => {
    expect(planSets(1, DEFAULT_COEFFICIENTS.A)).toEqual([1, 1, 1, 1, 1]);
  });

  it('applies intensity', () => {
    expect(planSets(20, [0.75], 0.9)).toEqual([14]);
  });
});

describe('planFor', () => {
  it('uses the deload factor in a deload cycle', () => {
    const state = { ...initialState(20), deload: true };
    expect(planFor(state, 'A', DEFAULT_COEFFICIENTS)).toEqual([14, 12, 10, 8, 7]);
  });
});

describe('sequence', () => {
  it('goes A → B → C → D → A', () => {
    expect(['A', 'B', 'C', 'D'].map((t) => nextInSequence(t as never))).toEqual(['B', 'C', 'D', 'A']);
  });

  it('advances after a training day and records the time', () => {
    const s = completeTraining(initialState(20), 'A', NOW);
    expect(s.next).toBe('B');
    expect(s.lastWorkoutAt).toBe(NOW);
    expect(s.cycle).toBe(1);
  });
});

describe('initialState', () => {
  it('rejects invalid max values', () => {
    expect(() => initialState(0)).toThrow();
    expect(() => initialState(2.5)).toThrow();
  });
});

describe('completeMaxTest', () => {
  const atD = { ...initialState(20), next: 'D' as const };

  it('accepts a higher max and starts a new cycle', () => {
    const s = completeMaxTest(atD, 24, NOW);
    expect(s).toMatchObject({ currentMax: 24, previousMax: 20, cycle: 2, next: 'A', plateauCount: 0, deload: false });
  });

  it('keeps the load when the max did not grow', () => {
    const s = completeMaxTest(atD, 20, NOW);
    expect(s).toMatchObject({ currentMax: 20, plateauCount: 1, deload: false });
    expect(planFor(s, 'A', DEFAULT_COEFFICIENTS)).toEqual(planFor(atD, 'A', DEFAULT_COEFFICIENTS));
  });

  it('accepts a lower max', () => {
    const s = completeMaxTest(atD, 17, NOW);
    expect(s).toMatchObject({ currentMax: 17, previousMax: 20, plateauCount: 1 });
  });

  it('starts a lighter cycle after two tests without growth, then resets', () => {
    const first = completeMaxTest(atD, 20, NOW);
    const second = completeMaxTest({ ...first, next: 'D' }, 20, NOW);
    expect(second).toMatchObject({ deload: true, plateauCount: 0 });

    const recovered = completeMaxTest({ ...second, next: 'D' }, 22, NOW);
    expect(recovered).toMatchObject({ deload: false, plateauCount: 0 });
  });

  it('growth resets the plateau counter', () => {
    const first = completeMaxTest(atD, 20, NOW);
    const second = completeMaxTest({ ...first, next: 'D' }, 21, NOW);
    expect(second.plateauCount).toBe(0);
  });

  it('rejects invalid results', () => {
    expect(() => completeMaxTest(atD, 0, NOW)).toThrow();
  });
});

describe('recovery', () => {
  it('recommends the day after next', () => {
    expect(recommendedNextDay(NOW)).toBe(new Date(2026, 9, 20).getTime());
    expect(recommendedNextDay(null)).toBeNull();
  });

  it('is a recovery day on the workout day and the day after', () => {
    expect(isRecoveryDay(NOW, NOW + 3600_000)).toBe(true);
    expect(isRecoveryDay(NOW, new Date(2026, 9, 19, 23, 0).getTime())).toBe(true);
    expect(isRecoveryDay(NOW, new Date(2026, 9, 20, 7, 0).getTime())).toBe(false);
    expect(isRecoveryDay(null, NOW)).toBe(false);
  });
});
