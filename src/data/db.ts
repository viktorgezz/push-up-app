import Dexie, { type EntityTable } from 'dexie';
import { DEFAULT_SETTINGS } from '../core/program';
import type { ActiveSession, Coefficients, ProgramState, Settings, WorkoutRecord } from '../core/types';

interface KvRow {
  key: KvKey;
  value: unknown;
}

type KvKey = 'settings' | 'program' | 'session';

export class AppDB extends Dexie {
  workouts!: EntityTable<WorkoutRecord, 'id'>;
  kv!: EntityTable<KvRow, 'key'>;

  constructor(name = 'push-up-app') {
    super(name);
    this.version(1).stores({
      workouts: '++id, startedAt, cycle, type, status',
      kv: 'key',
    });
  }
}

export const db = new AppDB();

async function getKv<T>(key: KvKey): Promise<T | null> {
  const row = await db.kv.get(key);
  return (row?.value as T | undefined) ?? null;
}

function putKv(key: KvKey, value: unknown) {
  return db.kv.put({ key, value });
}

export async function loadSettings(): Promise<Settings> {
  return withDefaults(await getKv<Partial<Settings>>('settings'));
}

function isCoefficientList(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0);
}

function isCoefficients(v: unknown): v is Coefficients {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return isCoefficientList(c.A) && isCoefficientList(c.B) && isCoefficientList(c.C);
}

/**
 * Fill missing fields and drop ones older versions stored (e.g. the fixed restSec).
 * Malformed values (e.g. from a hand-edited backup) fall back to the defaults.
 */
export function withDefaults(stored: Partial<Settings> | null | undefined): Settings {
  return {
    soundOn: typeof stored?.soundOn === 'boolean' ? stored.soundOn : DEFAULT_SETTINGS.soundOn,
    coefficients: isCoefficients(stored?.coefficients) ? stored.coefficients : DEFAULT_SETTINGS.coefficients,
  };
}

export const saveSettings = (settings: Settings) => putKv('settings', settings);

export const loadProgram = () => getKv<ProgramState>('program');
export const saveProgram = (program: ProgramState) => putKv('program', program);

export const loadSession = () => getKv<ActiveSession>('session');
export const saveSession = (session: ActiveSession) => putKv('session', session);
export const clearSession = () => db.kv.delete('session');

/** Finished workouts, newest first. */
export function listWorkouts(): Promise<WorkoutRecord[]> {
  return db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((w) => w.status === 'done')
    .toArray();
}

/** Store the workout, the new program state and drop the session atomically. */
export function commitWorkout(record: WorkoutRecord, program: ProgramState | null) {
  return db.transaction('rw', db.workouts, db.kv, async () => {
    await db.workouts.add(record);
    if (program) await saveProgram(program);
    await clearSession();
  });
}

export function resetAll() {
  return db.transaction('rw', db.workouts, db.kv, async () => {
    await db.workouts.clear();
    await db.kv.clear();
  });
}
