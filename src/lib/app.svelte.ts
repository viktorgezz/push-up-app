import { completeMaxTest, completeTraining, DEFAULT_SETTINGS, initialState, isTraining } from '../core/program';
import {
  adjustRest as adjustRestFn,
  completeSet,
  finishRest,
  isComplete,
  startSession,
  toWorkoutRecord,
  undoSet,
} from '../core/session';
import type { ActiveSession, ProgramState, Settings, WorkoutRecord } from '../core/types';
import { restoreBackup, type Backup } from '../data/backup';
import {
  clearSession,
  commitWorkout,
  listWorkouts,
  loadProgram,
  loadSession,
  loadSettings,
  resetAll,
  saveProgram,
  saveSession,
  saveSettings,
} from '../data/db';
import { playDone, playGo, unlockAudio } from '../services/audio';
import { isStandalone, requestPersistentStorage } from '../services/device';

export type Tab = 'today' | 'history' | 'progress' | 'settings';
export type Screen = Tab | 'onboarding' | 'workout' | 'summary';

export interface WorkoutResult {
  record: WorkoutRecord;
  before: ProgramState;
  after: ProgramState;
}

/** A session older than this is offered for resume/discard instead of reopening automatically. */
const STALE_SESSION_MS = 6 * 60 * 60 * 1000;

class AppStore {
  ready = $state(false);
  /** Set when local storage could not be opened; the app can't work without it. */
  error = $state<string | null>(null);
  screen = $state<Screen>('today');
  standalone = $state(false);

  // Raw state: replaced as a whole, never mutated, so it can go to IndexedDB as-is.
  settings = $state.raw<Settings>(DEFAULT_SETTINGS);
  program = $state.raw<ProgramState | null>(null);
  session = $state.raw<ActiveSession | null>(null);
  lastResult = $state.raw<WorkoutResult | null>(null);
  /**
   * Finished workouts, newest first. One shared copy for Today, History and Progress,
   * reloaded only after writes instead of on every tab switch.
   */
  workouts = $state.raw<WorkoutRecord[]>([]);

  /** A finished workout is being written; a second tap on Done must not save it twice. */
  private committing = false;

  async init() {
    try {
      this.standalone = isStandalone();
      const [settings, program, session, workouts] = await Promise.all([
        loadSettings(),
        loadProgram(),
        loadSession(),
        listWorkouts(),
      ]);
      this.settings = settings;
      this.program = program;
      this.session = session;
      this.workouts = workouts;

      if (!program) this.screen = 'onboarding';
      else if (session && !this.isSessionStale) this.screen = 'workout';
      else this.screen = 'today';

      this.ready = true;
    } catch (err) {
      console.error(err);
      this.error = 'Could not open the workout data on this device.';
    }
  }

  get isSessionStale(): boolean {
    return this.session !== null && Date.now() - this.session.startedAt > STALE_SESSION_MS;
  }

  go(screen: Screen) {
    this.screen = screen;
  }

  async completeOnboarding(max: number) {
    this.program = initialState(max);
    await saveProgram(this.program);
    requestPersistentStorage();
  }

  // --- workout -------------------------------------------------------------

  private setSession(session: ActiveSession) {
    if (this.committing) return;
    this.session = session;
    saveSession(session);
  }

  /** With Sounds off the app never opens an audio session, so it can't touch music playing in another app. */
  private unlockSound() {
    if (this.settings.soundOn) unlockAudio();
  }

  async startWorkout() {
    if (!this.program) return;
    this.unlockSound();
    this.setSession(startSession(this.program, this.settings, Date.now()));
    this.screen = 'workout';
  }

  resumeWorkout() {
    this.unlockSound();
    this.screen = 'workout';
  }

  // Every tap on the workout screen unlocks audio again: after iOS kills the app, it
  // reopens straight into the workout without passing through Start or Resume.

  async done() {
    if (!this.session || this.committing) return;
    this.unlockSound();
    if (this.settings.soundOn) playDone();
    const next = completeSet(this.session, Date.now());
    if (isComplete(next)) await this.finishTraining(next);
    else this.setSession(next);
  }

  undo() {
    this.unlockSound();
    if (this.session) this.setSession(undoSet(this.session));
  }

  adjustRest(deltaSec: number) {
    this.unlockSound();
    if (this.session) this.setSession(adjustRestFn(this.session, deltaSec, Date.now()));
  }

  skipRest() {
    this.unlockSound();
    this.endRest();
  }

  private endRest() {
    if (this.session) this.setSession(finishRest(this.session, Date.now()));
  }

  /** Called by the countdown once it reaches zero. Beeps only if the user is likely watching. */
  restElapsed() {
    if (!this.session || this.session.phase !== 'rest' || this.session.restEndsAt === null) return;
    const overdueMs = Date.now() - this.session.restEndsAt;
    if (this.settings.soundOn && overdueMs < 3000) playGo();
    this.endRest();
  }

  private async commit(record: WorkoutRecord, after: ProgramState) {
    if (this.committing) return;
    this.committing = true;
    try {
      const before = this.program!;
      await commitWorkout(record, after);
      this.program = after;
      this.session = null;
      this.lastResult = { record, before, after };
      this.screen = 'summary';
    } finally {
      this.committing = false;
    }
    this.workouts = await listWorkouts();
  }

  private async finishTraining(session: ActiveSession) {
    if (!this.program || !isTraining(session.type)) return;
    const now = Date.now();
    await this.commit(toWorkoutRecord(session, now, 'done'), completeTraining(this.program, session.type, now));
  }

  async submitTestResult(result: number) {
    if (!this.program || !this.session || this.session.type !== 'D') return;
    const now = Date.now();
    await this.commit(toWorkoutRecord(this.session, now, 'done', result), completeMaxTest(this.program, result, now));
  }

  /** End without counting it: the same workout stays next. */
  async abandonWorkout() {
    if (this.committing) return;
    const session = this.session;
    this.session = null;
    this.screen = 'today';
    if (session && session.sets.length > 0) await commitWorkout(toWorkoutRecord(session, Date.now(), 'aborted'), null);
    else await clearSession();
  }

  // --- settings & data -----------------------------------------------------

  async updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    await saveSettings(this.settings);
  }

  async importBackup(backup: Backup) {
    await restoreBackup(backup);
    this.lastResult = null;
    await this.init();
  }

  async resetEverything() {
    await resetAll();
    this.lastResult = null;
    await this.init();
  }
}

export const app = new AppStore();
