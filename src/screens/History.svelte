<script lang="ts">
  import { totalReps } from '../core/session';
  import type { WorkoutRecord } from '../core/types';
  import { app } from '../lib/app.svelte';
  import { formatDate, formatDuration, signed, workoutName } from '../lib/format';

  function meta(w: WorkoutRecord): string {
    const parts = [formatDate(w.startedAt)];
    if (w.type !== 'D') parts.push(formatDuration(w.finishedAt - w.startedAt));
    if (w.deload) parts.push('lighter');
    return parts.join(' · ');
  }

  const cycles = $derived.by(() => {
    const groups = new Map<number, WorkoutRecord[]>();
    for (const w of app.workouts) {
      if (!groups.has(w.cycle)) groups.set(w.cycle, []);
      groups.get(w.cycle)!.push(w);
    }
    return [...groups.entries()].map(([cycle, items]) => ({ cycle, items }));
  });
</script>

<div class="screen">
  <header>
    <h1>History</h1>
  </header>

  {#if app.workouts.length === 0}
    <div class="empty card">
      <p>No workouts yet.</p>
      <p class="muted">Finished workouts and max tests show up here.</p>
    </div>
  {/if}

  {#each cycles as group (group.cycle)}
    <section>
      <h2 class="eyebrow">Cycle {group.cycle}</h2>
      <ul class="card list">
        {#each group.items as w (w.id)}
          <li>
            <div class="type" class:test={w.type === 'D'}>{w.type === 'D' ? 'Max' : w.type}</div>
            <div class="info">
              <span class="name">{workoutName(w.type)}</span>
              <span class="muted small">{meta(w)}</span>
            </div>
            <div class="reps">
              <span class="num">{totalReps(w)}</span>
              {#if w.type === 'D' && w.testResult !== undefined}
                {@const d = w.testResult - w.maxBefore}
                <span class="small" class:up={d > 0}>{d === 0 ? '=' : signed(d)}</span>
              {:else}
                <span class="small muted">{w.sets.map((s) => s.planned).join('·')}</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: calc(var(--safe-top) + 16px) var(--gutter) 24px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 34px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  h2 {
    margin: 0 0 8px 4px;
  }

  .empty {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .list {
    margin: 0;
    padding: 0 16px;
    list-style: none;
  }

  li {
    display: grid;
    grid-template-columns: 44px 1fr auto;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 10px 0;
  }

  li + li {
    border-top: 0.5px solid var(--line);
  }

  .type {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--surface-2);
    font-weight: 700;
  }

  .type.test {
    background: var(--accent-soft);
    color: var(--accent-text);
    font-size: 13px;
  }

  .info,
  .reps {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .name {
    font-weight: 600;
  }

  .reps {
    align-items: flex-end;
  }

  .reps .num {
    font-size: 20px;
    font-weight: 700;
  }

  .small {
    font-size: calc(13 * var(--pt));
  }

  .up {
    color: var(--accent-text);
    font-weight: 600;
  }
</style>
