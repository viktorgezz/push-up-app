<script lang="ts">
  let { planned, current = -1, size = 'md' }: { planned: number[]; current?: number; size?: 'md' | 'lg' } = $props();
</script>

<ol class="pills {size}" aria-label="Sets">
  {#each planned as reps, i (i)}
    <li
      class:done={i < current}
      class:current={i === current}
      aria-label="Set {i + 1}: {reps} push-ups{i < current ? ', done' : ''}"
    >
      <span class="num">{reps}</span>
    </li>
  {/each}
</ol>

<style>
  .pills {
    display: flex;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    flex: 1;
    display: grid;
    place-items: center;
    height: 40px;
    border-radius: 12px;
    background: var(--surface-2);
    font-weight: 700;
    font-size: 17px;
    color: var(--text);
  }

  .lg li {
    height: 48px;
    font-size: 20px;
  }

  li.done {
    background: var(--accent-soft);
    color: var(--accent-text);
  }

  li.current {
    background: var(--accent);
    color: var(--on-accent);
  }
</style>
