import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, initialState } from './program';
import {
  adjustRest,
  completeSet,
  finishRest,
  isComplete,
  restRemainingMs,
  startSession,
  toWorkoutRecord,
  totalReps,
  undoSet,
} from './session';

const T0 = 1_000_000;
const sec = (n: number) => T0 + n * 1000;

function trainingSession() {
  return startSession(initialState(45), DEFAULT_SETTINGS, T0);
}

describe('training session', () => {
  it('plans the next workout from program state', () => {
    const s = trainingSession();
    expect(s).toMatchObject({ type: 'A', planned: [34, 29, 25, 20, 18], phase: 'set', setIndex: 0 });
  });

  it('Done starts the adaptive rest timer', () => {
    // 34 reps at max 45: 90 + 5 × (34/45)² × (45 − 25) = 147 → 145 s
    const s = completeSet(trainingSession(), sec(30));
    expect(s.phase).toBe('rest');
    expect(s.setIndex).toBe(1);
    expect(s.sets).toEqual([{ planned: 34, doneAt: sec(30), restAfterSec: 145 }]);
    expect(restRemainingMs(s, sec(40))).toBe(135_000);
    expect(restRemainingMs(s, sec(500))).toBe(0);
  });

  it('records the rest actually taken on the next set', () => {
    let s = completeSet(trainingSession(), sec(30));
    s = finishRest(s, sec(80)); // skipped after 50s
    expect(s.phase).toBe('set');
    s = completeSet(s, sec(100));
    expect(s.sets[1]).toMatchObject({ planned: 29, doneAt: sec(100), restBeforeSec: 50 });
  });

  it('caps the recorded rest at the planned end when the app was closed', () => {
    let s = completeSet(trainingSession(), sec(0));
    s = finishRest(s, sec(3600));
    expect(s.lastRestSec).toBe(145);
  });

  it('adjusts the rest but never into the past', () => {
    let s = completeSet(trainingSession(), sec(0));
    s = adjustRest(s, 15, sec(10));
    expect(restRemainingMs(s, sec(10))).toBe(150_000);
    s = adjustRest(s, -200, sec(10));
    expect(restRemainingMs(s, sec(10))).toBe(0);
  });

  it('undo reverts the last Done', () => {
    let s = completeSet(trainingSession(), sec(0));
    s = finishRest(s, sec(90));
    s = completeSet(s, sec(120));
    s = undoSet(s);
    expect(s).toMatchObject({ phase: 'set', setIndex: 1, lastRestSec: 90 });
    expect(s.sets).toHaveLength(1);
  });

  it('completes after the last set without a rest', () => {
    let s = trainingSession();
    for (let i = 0; i < 5; i++) {
      s = completeSet(s, sec(i * 100));
      if (i < 4) s = finishRest(s, sec(i * 100 + 90));
    }
    expect(isComplete(s)).toBe(true);
    expect(s.phase).toBe('set');
    expect(s.sets.map((set) => set.restAfterSec)).toEqual([145, 135, 125, 115, undefined]);
    expect(totalReps(toWorkoutRecord(s, sec(999), 'done'))).toBe(126);
  });
});

describe('max test session', () => {
  const state = { ...initialState(20), next: 'D' as const };

  it('asks for the result after Done', () => {
    let s = startSession(state, DEFAULT_SETTINGS, T0);
    expect(s.type).toBe('D');
    s = completeSet(s, sec(40));
    expect(s.phase).toBe('result');
    expect(isComplete(s)).toBe(false);

    const record = toWorkoutRecord(s, sec(60), 'done', 23);
    expect(record.testResult).toBe(23);
    expect(totalReps(record)).toBe(23);
  });

  it('undo returns to the test', () => {
    const s = undoSet(completeSet(startSession(state, DEFAULT_SETTINGS, T0), sec(40)));
    expect(s).toMatchObject({ phase: 'set', sets: [] });
  });

  it('rejects an invalid result', () => {
    const s = completeSet(startSession(state, DEFAULT_SETTINGS, T0), sec(40));
    expect(() => toWorkoutRecord(s, sec(60), 'done', 0)).toThrow();
  });
});
