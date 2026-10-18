<script lang="ts" module>
  export interface ChartPoint {
    /** Short axis label. */
    label: string;
    /** Longer tooltip/table label. */
    detail: string;
    value: number;
  }

  /** Clean upper bound and 3–4 ticks starting at 0. */
  function niceTicks(max: number): number[] {
    if (max <= 0) return [0, 1];
    const rough = max / 3;
    const pow = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
    const top = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
  }
</script>

<script lang="ts">
  let {
    points,
    kind,
    unit,
    title,
  }: { points: ChartPoint[]; kind: 'line' | 'bar'; unit: string; title: string } = $props();

  const H = 184;
  const PAD = { top: 16, right: 28, bottom: 26, left: 32 };

  let width = $state(320);
  let active = $state<number | null>(null);

  const ticks = $derived(niceTicks(Math.max(...points.map((p) => p.value), 1)));
  const yMax = $derived(ticks[ticks.length - 1]);
  const plotW = $derived(Math.max(1, width - PAD.left - PAD.right));
  const plotH = H - PAD.top - PAD.bottom;
  const slot = $derived(plotW / Math.max(points.length, 1));

  const x = (i: number) => (kind === 'bar' ? PAD.left + slot * (i + 0.5) : PAD.left + (points.length === 1 ? plotW / 2 : (plotW * i) / (points.length - 1)));
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const baseline = $derived(y(0));

  const linePath = $derived(points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(''));
  const areaPath = $derived(
    points.length > 1 ? `${linePath}L${x(points.length - 1)},${baseline}L${x(0)},${baseline}Z` : '',
  );

  const barW = $derived(Math.max(2, Math.min(24, slot - 2)));

  /** Column with a 4px rounded data end and a square baseline. */
  function barPath(i: number, v: number): string {
    const left = x(i) - barW / 2;
    const top = y(v);
    const h = baseline - top;
    const r = Math.min(4, barW / 2, h);
    return `M${left},${baseline}V${top + r}Q${left},${top} ${left + r},${top}H${left + barW - r}Q${left + barW},${top} ${left + barW},${top + r}V${baseline}Z`;
  }

  /** Show every label when they fit, otherwise thin them out evenly. */
  const labelEvery = $derived(Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(plotW / 34)))));

  function nearest(clientX: number, rect: DOMRect): number {
    const px = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  }

  function onPointer(e: PointerEvent) {
    active = nearest(e.clientX, (e.currentTarget as SVGElement).getBoundingClientRect());
  }

  const tip = $derived(active === null ? null : { p: points[active], x: x(active), y: y(points[active].value) });
</script>

<figure class="chart">
  <figcaption class="eyebrow">{title}</figcaption>
  <div class="plot" bind:clientWidth={width}>
    <svg
      width={width}
      height={H}
      role="img"
      aria-label="{title}: {points.map((p) => `${p.detail} ${p.value}`).join(', ')}"
      onpointerdown={onPointer}
      onpointermove={onPointer}
      onpointerleave={() => (active = null)}
    >
      {#each ticks as t (t)}
        <line class="grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
        <text class="tick" x={PAD.left - 8} y={y(t)} dy="0.32em" text-anchor="end">{t}</text>
      {/each}

      {#each points as p, i (i)}
        {#if i % labelEvery === 0 || i === points.length - 1}
          <text class="tick" x={x(i)} y={H - 6} text-anchor="middle">{p.label}</text>
        {/if}
      {/each}

      {#if kind === 'line'}
        {#if tip}<line class="crosshair" x1={tip.x} x2={tip.x} y1={PAD.top} y2={baseline} />{/if}
        {#if areaPath}<path class="area" d={areaPath} />{/if}
        <path class="line" d={linePath} />
        {#each points as p, i (i)}
          <circle class="dot" class:on={active === i} cx={x(i)} cy={y(p.value)} r={active === i ? 6 : 4} />
        {/each}
        {@const last = points[points.length - 1]}
        {#if last && active === null}
          <text class="end-label" x={x(points.length - 1)} y={y(last.value) - 12} text-anchor="middle">{last.value}</text>
        {/if}
      {:else}
        {#each points as p, i (i)}
          <path class="bar" class:dim={active !== null && active !== i} d={barPath(i, p.value)} />
        {/each}
      {/if}
    </svg>

    {#if tip}
      <div
        class="tooltip"
        style:left="{Math.min(Math.max(tip.x, 60), width - 60)}px"
        style:top="{tip.y - 12}px"
      >
        <strong class="num">{tip.p.value}</strong>
        <span>{unit} · {tip.p.detail}</span>
      </div>
    {/if}
  </div>

  <details>
    <summary>Show data</summary>
    <table>
      <tbody>
        {#each points as p, i (i)}
          <tr><td>{p.detail}</td><td class="num">{p.value}</td></tr>
        {/each}
      </tbody>
    </table>
  </details>
</figure>

<style>
  .chart {
    margin: 0;
  }

  .plot {
    position: relative;
    margin-top: 12px;
    touch-action: pan-y;
  }

  svg {
    display: block;
    overflow: visible;
  }

  .grid {
    stroke: var(--grid);
    stroke-width: 1;
  }

  .crosshair {
    stroke: var(--text-3);
    stroke-width: 1;
  }

  .tick {
    fill: var(--text-3);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .end-label {
    fill: var(--text);
    font-size: 13px;
    font-weight: 700;
  }

  .line {
    fill: none;
    stroke: var(--chart);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .area {
    fill: var(--chart);
    opacity: 0.1;
  }

  .dot {
    fill: var(--chart);
    stroke: var(--surface);
    stroke-width: 2;
  }

  .bar {
    fill: var(--chart);
    transition: opacity 0.12s;
  }

  .bar.dim {
    opacity: 0.4;
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 10px;
    border-radius: 10px;
    background: var(--surface-2);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
    pointer-events: none;
    white-space: nowrap;
  }

  .tooltip strong {
    font-size: 17px;
    color: var(--text);
  }

  .tooltip span {
    font-size: 12px;
    color: var(--text-2);
  }

  details {
    margin-top: 8px;
    font-size: 14px;
    color: var(--text-2);
  }

  summary {
    min-height: 32px;
    display: flex;
    align-items: center;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  td {
    padding: 6px 0;
    border-top: 0.5px solid var(--line);
  }

  td:last-child {
    text-align: right;
    color: var(--text);
  }
</style>
