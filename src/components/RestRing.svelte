<script lang="ts">
  import { formatClock } from '../lib/format';

  let { remainingMs, totalMs }: { remainingMs: number; totalMs: number } = $props();

  const R = 46;
  const C = 2 * Math.PI * R;
  const fraction = $derived(totalMs > 0 ? Math.min(1, remainingMs / totalMs) : 0);
</script>

<div class="ring" role="timer" aria-label="Rest remaining {formatClock(remainingMs)}">
  <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle class="track" cx="50" cy="50" r={R} />
    <circle
      class="fill"
      cx="50"
      cy="50"
      r={R}
      stroke-dasharray={C}
      stroke-dashoffset={C * (1 - fraction)}
    />
  </svg>
  <div class="center">
    <span class="eyebrow">Rest</span>
    <span class="time num">{formatClock(remainingMs)}</span>
  </div>
</div>

<style>
  .ring {
    position: relative;
    width: var(--ring-size, min(72vw, 300px));
    aspect-ratio: 1;
    container-type: inline-size;
  }

  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 5;
  }

  .track {
    stroke: var(--surface-2);
  }

  .fill {
    stroke: var(--accent);
    stroke-linecap: round;
  }

  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .time {
    /* Scales with the ring, so a smaller ring in landscape still fits the time. */
    font-size: 25cqi;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.03em;
  }
</style>
