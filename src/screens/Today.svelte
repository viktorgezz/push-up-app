<script lang="ts">
  import CycleTrack from '../components/CycleTrack.svelte';
  import SetPills from '../components/SetPills.svelte';
  import { isRecoveryDay, isTraining, planFor, recommendedNextDay } from '../core/program';
  import { restPlan } from '../core/rest';
  import { totalReps } from '../core/session';
  import { app } from '../lib/app.svelte';
  import { ask } from '../lib/confirm.svelte';
  import { formatRelativeDay, formatRestRange, formatTime, signed, workoutName } from '../lib/format';

  const program = $derived(app.program!);
  const next = $derived(program.next);
  const planned = $derived(isTraining(next) ? planFor(program, next, app.settings.coefficients) : []);
  const plannedTotal = $derived(planned.reduce((a, b) => a + b, 0));
  const rests = $derived(restPlan(planned, program.currentMax));

  // iOS keeps the app alive in the background: refresh "today" when it comes back, e.g. the next morning.
  let now = $state(Date.now());
  const recovery = $derived(isRecoveryDay(program.lastWorkoutAt, now));
  const nextDay = $derived(recommendedNextDay(program.lastWorkoutAt));
  const maxDelta = $derived(program.previousMax === null ? null : program.currentMax - program.previousMax);

  const total = $derived(app.workouts.reduce((sum, w) => sum + totalReps(w), 0));

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') now = Date.now();
  }

  async function discard() {
    if (await ask('Discard the unfinished workout?', { confirmLabel: 'Discard', danger: true })) app.abandonWorkout();
  }
</script>

<svelte:document onvisibilitychange={onVisibilityChange} />

<div class="screen">
  <header>
    <p class="eyebrow">Cycle {program.cycle}</p>
    <h1>Today</h1>
  </header>

  {#if app.session}
    <section class="card resume">
      <div>
        <h2>Unfinished workout</h2>
        <p class="muted">
          {workoutName(app.session.type)} · started {formatRelativeDay(app.session.startedAt, now)}
          at {formatTime(app.session.startedAt)}
        </p>
      </div>
      <div class="row">
        <button class="btn btn-primary" onclick={() => app.resumeWorkout()}>Resume</button>
        <button class="btn btn-danger" onclick={discard}>Discard</button>
      </div>
    </section>
  {:else}
    <section class="card next">
      <CycleTrack {next} />

      <div class="title">
        <p class="eyebrow">Up next</p>
        <h2>{workoutName(next)}</h2>
        {#if program.deload && next !== 'D'}
          <span class="badge">Lighter cycle · 90% load</span>
        {/if}
      </div>

      {#if isTraining(next)}
        <SetPills {planned} size="lg" />
        <p class="meta">
          <span class="num">{plannedTotal}</span> push-ups · {planned.length} sets · rest
          <span class="num">{formatRestRange(rests)}</span>
        </p>
      {:else}
        <p class="test-copy">
          One all-out set to find your new max. Your next cycle is rebuilt from the result.
        </p>
      {/if}

      {#if recovery && nextDay !== null}
        <p class="recovery">
          <span class="dot"></span>
          Recovery day — next workout recommended {formatRelativeDay(nextDay, now)}.
        </p>
        <button class="btn btn-lg btn-block" onclick={() => app.startWorkout()}>Train anyway</button>
      {:else}
        <button class="btn btn-primary btn-lg btn-block" onclick={() => app.startWorkout()}>
          {next === 'D' ? 'Start max test' : 'Start workout'}
        </button>
      {/if}
    </section>
  {/if}

  <section class="stats">
    <div class="card stat">
      <span class="eyebrow">Max</span>
      <span class="value num">{program.currentMax}</span>
      {#if maxDelta !== null}
        <span class="delta" class:up={maxDelta > 0}>{maxDelta === 0 ? 'no change' : signed(maxDelta)}</span>
      {/if}
    </div>
    <div class="card stat">
      <span class="eyebrow">Total</span>
      <span class="value num">{total}</span>
      <span class="delta">push-ups</span>
    </div>
    <div class="card stat">
      <span class="eyebrow">Workouts</span>
      <span class="value num">{app.workouts.length}</span>
      <span class="delta">done</span>
    </div>
  </section>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: calc(var(--safe-top) + 16px) var(--gutter) 24px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  h2 {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .next {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .badge {
    margin-top: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-text);
    font-size: 13px;
    font-weight: 600;
  }

  .meta,
  .test-copy {
    margin-top: -8px;
    color: var(--text-2);
  }

  .recovery {
    display: flex;
    align-items: baseline;
    gap: 8px;
    color: var(--text-2);
    font-size: calc(15 * var(--pt));
  }

  .dot {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--chart);
    transform: translateY(-1px);
  }

  .resume {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .resume h2 {
    font-size: calc(22 * var(--pt));
  }

  .row {
    display: flex;
    gap: 8px;
  }

  .row .btn {
    flex: 1;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 14px;
    min-width: 0;
  }

  .stat .eyebrow {
    font-size: 11px;
  }

  .value {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .delta {
    font-size: 13px;
    color: var(--text-3);
  }

  .delta.up {
    color: var(--accent-text);
    font-weight: 600;
  }
</style>
