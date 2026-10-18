/** A, B, C are training days; D is the max test that closes a cycle. */
export type WorkoutType = 'A' | 'B' | 'C' | 'D';
export type TrainingType = Exclude<WorkoutType, 'D'>;

export type Coefficients = Record<TrainingType, number[]>;

export interface Settings {
  soundOn: boolean;
  coefficients: Coefficients;
}

export interface ProgramState {
  /** Current one-set max (M). */
  currentMax: number;
  /** Max before the last test, for showing the delta. Null until the first test after onboarding. */
  previousMax: number | null;
  /** 1-based cycle number. */
  cycle: number;
  next: WorkoutType;
  /** Consecutive max tests without growth. */
  plateauCount: number;
  /** The current cycle runs at reduced load after a plateau. */
  deload: boolean;
  lastWorkoutAt: number | null;
}

export interface SetRecord {
  planned: number;
  doneAt: number;
  /** Adaptive rest planned after this set, seconds. Absent after the last set. */
  restAfterSec?: number;
  /** Rest actually taken before this set, seconds. Absent for the first set. */
  restBeforeSec?: number;
}

export interface WorkoutRecord {
  id?: number;
  cycle: number;
  type: WorkoutType;
  status: 'done' | 'aborted';
  startedAt: number;
  finishedAt: number;
  maxBefore: number;
  deload: boolean;
  sets: SetRecord[];
  /** Max test result, only for type D. */
  testResult?: number;
}

export type SessionPhase = 'set' | 'rest' | 'result';

/** The in-progress workout. Persisted so the app can resume after iOS kills it. */
export interface ActiveSession {
  type: WorkoutType;
  cycle: number;
  maxBefore: number;
  deload: boolean;
  /** Planned reps per set. For D a single 0 entry: "as many as possible". */
  planned: number[];
  setIndex: number;
  phase: SessionPhase;
  sets: SetRecord[];
  restStartedAt: number | null;
  restEndsAt: number | null;
  /** Rest taken before the current set; moved into its SetRecord on Done. */
  lastRestSec: number | null;
  startedAt: number;
}
