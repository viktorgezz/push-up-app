import type { Coefficients, ProgramState, Settings, TrainingType, WorkoutType } from './types';

export const DEFAULT_COEFFICIENTS: Coefficients = {
  A: [0.75, 0.65, 0.55, 0.45, 0.4],
  B: [0.8, 0.7, 0.6, 0.5, 0.45],
  C: [0.85, 0.75, 0.65, 0.55, 0.5],
};

export const DEFAULT_SETTINGS: Settings = {
  soundOn: true,
  coefficients: DEFAULT_COEFFICIENTS,
};

/** Max tests in a row without growth before a lighter cycle kicks in. */
export const PLATEAU_LIMIT = 2;
export const DELOAD_FACTOR = 0.9;
export const MAX_REPS_LIMIT = 999;

export const SEQUENCE: WorkoutType[] = ['A', 'B', 'C', 'D'];

export function isTraining(type: WorkoutType): type is TrainingType {
  return type !== 'D';
}

export function isValidMax(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_REPS_LIMIT;
}

export function initialState(max: number): ProgramState {
  if (!isValidMax(max)) throw new RangeError(`Invalid max: ${max}`);
  return {
    currentMax: max,
    previousMax: null,
    cycle: 1,
    next: 'A',
    plateauCount: 0,
    deload: false,
    lastWorkoutAt: null,
  };
}

/** Reps per set: M × coefficient × intensity, rounded, never below 1. */
export function planSets(max: number, coefficients: number[], intensity = 1): number[] {
  return coefficients.map((c) => Math.max(1, Math.round(max * c * intensity)));
}

export function planFor(state: ProgramState, type: TrainingType, coefficients: Coefficients): number[] {
  return planSets(state.currentMax, coefficients[type], state.deload ? DELOAD_FACTOR : 1);
}

export function nextInSequence(type: WorkoutType): WorkoutType {
  return SEQUENCE[(SEQUENCE.indexOf(type) + 1) % SEQUENCE.length];
}

/** A training day (A/B/C) was completed: move on to the next one. */
export function completeTraining(state: ProgramState, type: TrainingType, now: number): ProgramState {
  return { ...state, next: nextInSequence(type), lastWorkoutAt: now };
}

/**
 * The max test closes the cycle. The new max is always accepted: a higher max
 * scales the next cycle up, an equal one keeps the load, a lower one scales it down.
 * After PLATEAU_LIMIT tests without growth the next cycle is a lighter one.
 */
export function completeMaxTest(state: ProgramState, newMax: number, now: number): ProgramState {
  if (!isValidMax(newMax)) throw new RangeError(`Invalid max: ${newMax}`);

  const grew = newMax > state.currentMax;
  let plateauCount = grew ? 0 : state.plateauCount + 1;
  const deload = plateauCount >= PLATEAU_LIMIT;
  if (deload) plateauCount = 0;

  return {
    currentMax: newMax,
    previousMax: state.currentMax,
    cycle: state.cycle + 1,
    next: 'A',
    plateauCount,
    deload,
    lastWorkoutAt: now,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** One rest day between workouts: the next one is recommended two calendar days after the last. */
export function recommendedNextDay(lastWorkoutAt: number | null): number | null {
  if (lastWorkoutAt === null) return null;
  const d = new Date(startOfDay(lastWorkoutAt));
  d.setDate(d.getDate() + 2);
  return d.getTime();
}

export function isRecoveryDay(lastWorkoutAt: number | null, now: number): boolean {
  const next = recommendedNextDay(lastWorkoutAt);
  return next !== null && startOfDay(now) < next;
}

export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}
