import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, initialState } from '../core/program';
import type { WorkoutRecord } from '../core/types';
import { BackupError, createBackup, parseBackup, restoreBackup } from './backup';
import { commitWorkout, listWorkouts, loadProgram, loadSettings, resetAll, saveSession, loadSession } from './db';

const workout: WorkoutRecord = {
  cycle: 1,
  type: 'A',
  status: 'done',
  startedAt: 1000,
  finishedAt: 2000,
  maxBefore: 20,
  deload: false,
  sets: [{ planned: 15, doneAt: 1500 }],
};

beforeEach(() => resetAll());

describe('db', () => {
  it('commits a workout with the new program and clears the session', async () => {
    await saveSession({} as never);
    await commitWorkout(workout, { ...initialState(20), next: 'B' });
    expect(await listWorkouts()).toHaveLength(1);
    expect((await loadProgram())?.next).toBe('B');
    expect(await loadSession()).toBeNull();
  });

  it('hides aborted workouts from the list', async () => {
    await commitWorkout({ ...workout, status: 'aborted' }, null);
    expect(await listWorkouts()).toHaveLength(0);
  });
});

describe('backup', () => {
  it('round-trips through JSON', async () => {
    await commitWorkout(workout, initialState(20));
    const json = JSON.stringify(await createBackup());

    await resetAll();
    await restoreBackup(parseBackup(json));

    expect(await listWorkouts()).toMatchObject([{ type: 'A', sets: [{ planned: 15 }] }]);
    expect((await loadProgram())?.currentMax).toBe(20);
    expect((await loadSettings()).soundOn).toBe(true);
  });

  it('rejects foreign or broken files', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"other"}')).toThrow(BackupError);
    expect(() =>
      parseBackup(JSON.stringify({ app: 'push-up-app', schemaVersion: 99, program: null, workouts: [] })),
    ).toThrow(/newer version/);
    expect(() =>
      parseBackup(JSON.stringify({ app: 'push-up-app', schemaVersion: 1, program: null, workouts: [{}] })),
    ).toThrow(/invalid workouts/);
  });

  const file = (extra: object) => JSON.stringify({ app: 'push-up-app', schemaVersion: 1, program: null, workouts: [], ...extra });

  it('rejects workouts whose sets would render as NaN', () => {
    const badSets = { ...workout, sets: [{ doneAt: 1500 }] };
    expect(() => parseBackup(file({ workouts: [badSets] }))).toThrow(/invalid workouts/);
  });

  it('fills program fields the engine counts on', () => {
    const backup = parseBackup(file({ program: { currentMax: 20, cycle: 3, next: 'D' } }));
    expect(backup.program).toEqual({
      currentMax: 20,
      previousMax: null,
      cycle: 3,
      next: 'D',
      plateauCount: 0,
      deload: false,
      lastWorkoutAt: null,
    });
  });

  it('falls back to default settings for malformed values', () => {
    const backup = parseBackup(file({ settings: { soundOn: 'yes', coefficients: { A: 'x' } } }));
    expect(backup.settings).toEqual(DEFAULT_SETTINGS);
  });
});
