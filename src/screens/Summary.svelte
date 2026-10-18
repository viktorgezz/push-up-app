<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import SetPills from '../components/SetPills.svelte';
  import { planFor, recommendedNextDay } from '../core/program';
  import { totalReps } from '../core/session';
  import type { TrainingType } from '../core/types';
  import { app } from '../lib/app.svelte';
  import { formatDuration, formatRelativeDay, signed, workoutName } from '../lib/format';
  import { randomMotivation } from '../lib/motivation';

  const result = app.lastResult!;
  const { record, before, after } = result;
  const isTest = record.type === 'D';
  const motivation = randomMotivation();
  const delta = after.currentMax - before.currentMax;
  const nextDay = recommendedNextDay(after.lastWorkoutAt);
  const plans = (['A', 'B', 'C'] as TrainingType[]).map((t) => ({
    type: t,
    sets: planFor(after, t, app.settings.coefficients),
  }));
</script>

<div class="summary">
  <main>
    <div class="badge" aria-hidden="true"><Icon name="check" size={36} stroke={3} /></div>

    {#if isTest}
      <p class="eyebrow">Cycle {record.cycle} complete</p>
      <h1>New max</h1>
      <p class="big num">{after.currentMax}</p>
      <p class="delta" class:up={delta > 0}>
        {#if delta > 0}
          {signed(delta)} from {before.currentMax}. Your next cycle gets harder.
        {:else if delta === 0}
          Same as last time. The load stays the same.
        {:else}
          {signed(delta)} from {before.currentMax}. The next cycle is scaled down to match.
        {/if}
      </p>
      {#if after.deload}
        <p class="note card">
          No growth for two tests in a row, so cycle {after.cycle} runs at 90% load to let you recover.
        </p>
      {/if}

      <section class="card plans">
        <p class="eyebrow">Cycle {after.cycle}</p>
        {#each plans as plan (plan.type)}
          <div class="plan">
            <span class="plan-name">{plan.type}</span>
            <SetPills planned={plan.sets} />
          </div>
        {/each}
      </section>
    {:else}
      <p class="eyebrow">{workoutName(record.type)} · Cycle {record.cycle}</p>
      <h1>Workout done</h1>
      <p class="big num">{totalReps(record)}</p>
      <p class="delta">push-ups in {formatDuration(record.finishedAt - record.startedAt)}</p>
      <section class="card">
        <SetPills planned={record.sets.map((s) => s.planned)} current={record.sets.length} />
      </section>
      <p class="next muted">
        Next: <strong>{workoutName(after.next)}</strong>{#if nextDay !== null}, recommended
          {formatRelativeDay(nextDay)}{/if}.
      </p>
    {/if}

    <blockquote class="motivation">{motivation}</blockquote>
  </main>

  <footer>
    <button class="btn btn-primary btn-lg btn-block" onclick={() => app.go('today')}>Done</button>
  </footer>
</div>

<style>
  .summary {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: calc(var(--safe-top) + 24px) var(--gutter) calc(var(--safe-bottom) + 16px);
    overflow-y: auto;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
  }

  .badge {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    margin-bottom: 12px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
  }

  h1 {
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 800;
  }

  .big {
    font-size: 112px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.05em;
  }

  .delta {
    max-width: 320px;
    color: var(--text-2);
  }

  .delta.up {
    color: var(--accent-text);
    font-weight: 600;
  }

  .card {
    width: 100%;
    margin-top: 16px;
  }

  .note {
    color: var(--text-2);
    font-size: calc(15 * var(--pt));
    text-align: left;
  }

  .plans {
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
  }

  .plan {
    display: grid;
    grid-template-columns: 24px 1fr;
    align-items: center;
    gap: 10px;
  }

  .plan-name {
    font-weight: 700;
    color: var(--text-2);
  }

  .next {
    margin-top: 12px;
  }

  .next strong {
    color: var(--text);
  }

  .motivation {
    max-width: 320px;
    margin: 24px 0 0;
    padding-top: 20px;
    border-top: 0.5px solid var(--line);
    color: var(--text-2);
    font-size: calc(17 * var(--pt));
    font-weight: 500;
    line-height: 1.45;
  }

  footer {
    padding-top: 16px;
  }

  /* Phone on its side: don't stretch text and buttons across the whole width. */
  main,
  footer {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
  }
</style>
