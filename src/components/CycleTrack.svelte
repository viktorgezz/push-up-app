<script lang="ts">
  import { SEQUENCE } from '../core/program';
  import type { WorkoutType } from '../core/types';

  let { next }: { next: WorkoutType } = $props();
  const nextIndex = $derived(SEQUENCE.indexOf(next));
</script>

<ol class="track" aria-label="Cycle progress">
  {#each SEQUENCE as type, i (type)}
    {@const state = i < nextIndex ? 'done' : i === nextIndex ? 'current' : 'upcoming'}
    <li class={state} aria-current={state === 'current' ? 'step' : undefined}>
      <span class="bar"></span>
      <span class="label">{type === 'D' ? 'Test' : type}</span>
    </li>
  {/each}
</ol>

<style>
  .track {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bar {
    height: 6px;
    border-radius: 3px;
    background: var(--surface-2);
  }

  .done .bar {
    background: var(--accent);
    opacity: 0.55;
  }

  .current .bar {
    background: var(--accent);
  }

  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-3);
  }

  .current .label {
    color: var(--text);
  }
</style>
