import { isValidMax } from '../core/program';
import type { ProgramState, Settings, WorkoutRecord, WorkoutType } from '../core/types';
import { db, loadProgram, loadSettings, withDefaults } from './db';

export const BACKUP_APP = 'push-up-app';
export const BACKUP_SCHEMA_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  settings: Settings;
  program: ProgramState | null;
  workouts: WorkoutRecord[];
}

export async function createBackup(now = new Date()): Promise<Backup> {
  return {
    app: BACKUP_APP,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    settings: await loadSettings(),
    program: await loadProgram(),
    workouts: await db.workouts.orderBy('startedAt').toArray(),
  };
}

export class BackupError extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const WORKOUT_TYPES = new Set(['A', 'B', 'C', 'D']);

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isWorkout(v: unknown): v is WorkoutRecord {
  return (
    isObject(v) &&
    WORKOUT_TYPES.has(v.type as string) &&
    isNumber(v.startedAt) &&
    isNumber(v.finishedAt) &&
    isNumber(v.cycle) &&
    isNumber(v.maxBefore) &&
    (v.testResult === undefined || isNumber(v.testResult)) &&
    Array.isArray(v.sets) &&
    v.sets.every((set) => isObject(set) && isNumber(set.planned))
  );
}

function isProgram(v: unknown): v is Record<string, unknown> {
  return (
    isObject(v) &&
    typeof v.currentMax === 'number' &&
    isValidMax(v.currentMax) &&
    Number.isInteger(v.cycle) &&
    (v.cycle as number) >= 1 &&
    WORKOUT_TYPES.has(v.next as string)
  );
}

/** Fill the fields the engine counts on, so a hand-edited backup can't turn them into NaN. */
function normalizeProgram(v: Record<string, unknown>): ProgramState {
  return {
    currentMax: v.currentMax as number,
    previousMax: typeof v.previousMax === 'number' && isValidMax(v.previousMax) ? v.previousMax : null,
    cycle: v.cycle as number,
    next: v.next as WorkoutType,
    plateauCount: Number.isInteger(v.plateauCount) && (v.plateauCount as number) >= 0 ? (v.plateauCount as number) : 0,
    deload: v.deload === true,
    lastWorkoutAt: isNumber(v.lastWorkoutAt) ? v.lastWorkoutAt : null,
  };
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('The file is not valid JSON.');
  }
  if (!isObject(data) || data.app !== BACKUP_APP) throw new BackupError('This is not a Push-Ups backup file.');
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupError('This backup was made by a newer version of the app.');
  }
  if (data.program !== null && !isProgram(data.program)) throw new BackupError('The backup has an invalid program.');
  if (!Array.isArray(data.workouts) || !data.workouts.every(isWorkout)) {
    throw new BackupError('The backup has invalid workouts.');
  }

  return {
    app: BACKUP_APP,
    schemaVersion: data.schemaVersion,
    exportedAt: String(data.exportedAt ?? ''),
    settings: withDefaults(isObject(data.settings) ? (data.settings as Partial<Settings>) : null),
    program: data.program === null ? null : normalizeProgram(data.program as Record<string, unknown>),
    workouts: data.workouts as WorkoutRecord[],
  };
}

/** Replace all local data with the backup. Any in-progress session is dropped. */
export function restoreBackup(backup: Backup) {
  return db.transaction('rw', db.workouts, db.kv, async () => {
    await db.workouts.clear();
    await db.kv.clear();
    await db.kv.put({ key: 'settings', value: backup.settings });
    if (backup.program) await db.kv.put({ key: 'program', value: backup.program });
    await db.workouts.bulkAdd(backup.workouts.map(({ id: _id, ...w }) => w));
  });
}

export function backupFileName(now = new Date()): string {
  return `push-ups-backup-${now.toISOString().slice(0, 10)}.json`;
}
