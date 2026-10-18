<script lang="ts">
  import Chart, { type ChartPoint } from '../components/Chart.svelte';
  import { totalReps } from '../core/session';
  import { app } from '../lib/app.svelte';
  import { formatDate, signed, workoutName } from '../lib/format';

  const RECENT = 20;

  /** Oldest first. */
  const workouts = $derived(app.workouts.slice().reverse());

  const tests = $derived(workouts.filter((w) => w.type === 'D' && w.testResult !== undefined));
  const startMax = $derived(workouts[0]?.maxBefore ?? app.program?.currentMax ?? 0);

  const maxPoints = $derived<ChartPoint[]>([
    { label: 'Start', detail: 'Starting max', value: startMax },
    ...tests.map((w) => ({ label: `C${w.cycle}`, detail: `Cycle ${w.cycle} · ${formatDate(w.startedAt)}`, value: w.testResult! })),
  ]);

  const volumePoints = $derived<ChartPoint[]>(
    workouts
      .filter((w) => w.type !== 'D')
      .slice(-RECENT)
      .map((w) => ({
        label: w.type,
        detail: `${workoutName(w.type)} · ${formatDate(w.startedAt)}`,
        value: totalReps(w),
      })),
  );

  const current = $derived(app.program?.currentMax ?? 0);
  const best = $derived(Math.max(startMax, ...tests.map((w) => w.testResult!)));
  const gain = $derived(current - startMax);
  const total = $derived(workouts.reduce((s, w) => s + totalReps(w), 0));
</script>

<div class="screen">
  <header>
    <h1>Progress</h1>
  </header>

  <section class="hero card">
    <span class="eyebrow">Current max</span>
    <span class="value num">{current}</span>
    <span class="muted">
      {#if tests.length === 0}
        Finish your first cycle to see growth.
      {:else}
        {signed(gain)} since start · best {best}
      {/if}
    </span>
  </section>

  <section class="card">
    {#if tests.length === 0}
      <p class="eyebrow">Max per cycle</p>
      <p class="muted empty">Your max after each cycle will be charted here.</p>
    {:else}
      <Chart points={maxPoints} kind="line" unit="push-ups" title="Max per cycle" />
    {/if}
  </section>

  <section class="card">
    {#if volumePoints.length === 0}
      <p class="eyebrow">Push-ups per workout</p>
      <p class="muted empty">Complete a workout to see your volume.</p>
    {:else}
      <Chart points={volumePoints} kind="bar" unit="push-ups" title="Push-ups per workout · last {RECENT}" />
    {/if}
  </section>

  <section class="totals">
    <div class="card stat">
      <span class="eyebrow">Total push-ups</span>
      <span class="num">{total.toLocaleString('en-US')}</span>
    </div>
    <div class="card stat">
      <span class="eyebrow">Cycles done</span>
      <span class="num">{tests.length}</span>
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

  .hero {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hero .value {
    font-size: 64px;
    font-weight: 700;
    line-height: 1.05;
    letter-spacing: -0.03em;
  }

  .empty {
    margin-top: 8px;
  }

  .totals {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
  }

  .stat .num {
    font-size: 26px;
    font-weight: 700;
  }
</style>
