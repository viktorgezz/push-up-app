import { isTraining, isValidMax, planFor } from './program';
import { restAfterSet } from './rest';
import type { ActiveSession, ProgramState, Settings, WorkoutRecord } from './types';

/** Longest rest a user can stretch a single break to with the +15s button. */
const REST_HARD_LIMIT_SEC = 600;

export function startSession(state: ProgramState, settings: Settings, now: number): ActiveSession {
  const type = state.next;
  return {
    type,
    cycle: state.cycle,
    maxBefore: state.currentMax,
    deload: state.deload,
    planned: isTraining(type) ? planFor(state, type, settings.coefficients) : [0],
    setIndex: 0,
    phase: 'set',
    sets: [],
    restStartedAt: null,
    restEndsAt: null,
    lastRestSec: null,
    startedAt: now,
  };
}

export function isComplete(s: ActiveSession): boolean {
  return isTraining(s.type) && s.sets.length === s.planned.length;
}

/** The user pressed Done: record the set and start the rest (or ask for the test result). */
export function completeSet(s: ActiveSession, now: number): ActiveSession {
  if (s.phase !== 'set') return s;

  const reps = s.planned[s.setIndex];
  const isLast = s.type === 'D' || s.setIndex === s.planned.length - 1;
  const restSec = isLast ? null : restAfterSet(reps, s.maxBefore, s.setIndex);
  const sets = [
    ...s.sets,
    {
      planned: reps,
      doneAt: now,
      ...(restSec !== null && { restAfterSec: restSec }),
      ...(s.lastRestSec !== null && { restBeforeSec: s.lastRestSec }),
    },
  ];

  if (s.type === 'D') return { ...s, sets, phase: 'result', lastRestSec: null };

  const next = { ...s, sets, setIndex: s.setIndex + 1, lastRestSec: null };
  if (restSec === null) return next;

  return {
    ...next,
    phase: 'rest',
    restStartedAt: now,
    restEndsAt: now + restSec * 1000,
  };
}

/** Revert an accidental Done. */
export function undoSet(s: ActiveSession): ActiveSession {
  if (s.phase === 'set' || s.sets.length === 0) return s;
  const last = s.sets[s.sets.length - 1];
  return {
    ...s,
    sets: s.sets.slice(0, -1),
    setIndex: s.type === 'D' ? s.setIndex : s.setIndex - 1,
    phase: 'set',
    restStartedAt: null,
    restEndsAt: null,
    lastRestSec: last.restBeforeSec ?? null,
  };
}

export function restRemainingMs(s: ActiveSession, now: number): number {
  if (s.phase !== 'rest' || s.restEndsAt === null) return 0;
  return Math.max(0, s.restEndsAt - now);
}

export function adjustRest(s: ActiveSession, deltaSec: number, now: number): ActiveSession {
  if (s.phase !== 'rest' || s.restEndsAt === null || s.restStartedAt === null) return s;
  const maxEnd = s.restStartedAt + REST_HARD_LIMIT_SEC * 1000;
  const restEndsAt = Math.min(maxEnd, Math.max(now, s.restEndsAt + deltaSec * 1000));
  return { ...s, restEndsAt };
}

/** Rest is over (timer ran out or Skip): move to the next set. */
export function finishRest(s: ActiveSession, now: number): ActiveSession {
  if (s.phase !== 'rest' || s.restStartedAt === null) return s;
  const endedAt = Math.min(now, s.restEndsAt ?? now);
  return {
    ...s,
    phase: 'set',
    restStartedAt: null,
    restEndsAt: null,
    lastRestSec: Math.round((endedAt - s.restStartedAt) / 1000),
  };
}

export function toWorkoutRecord(
  s: ActiveSession,
  now: number,
  status: WorkoutRecord['status'],
  testResult?: number,
): WorkoutRecord {
  if (testResult !== undefined && !isValidMax(testResult)) throw new RangeError(`Invalid result: ${testResult}`);
  return {
    cycle: s.cycle,
    type: s.type,
    status,
    startedAt: s.startedAt,
    finishedAt: now,
    maxBefore: s.maxBefore,
    deload: s.deload,
    sets: s.sets,
    ...(testResult !== undefined && { testResult }),
  };
}

export function totalReps(w: Pick<WorkoutRecord, 'type' | 'sets' | 'testResult'>): number {
  if (w.type === 'D') return w.testResult ?? 0;
  return w.sets.reduce((sum, set) => sum + set.planned, 0);
}
