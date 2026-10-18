<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '../components/Icon.svelte';
  import RestRing from '../components/RestRing.svelte';
  import SetPills from '../components/SetPills.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { MAX_REPS_LIMIT, isValidMax } from '../core/program';
  import { setIntensity } from '../core/rest';
  import { restRemainingMs } from '../core/session';
  import { app } from '../lib/app.svelte';
  import { ask } from '../lib/confirm.svelte';
  import { workoutName } from '../lib/format';
  import { playTick } from '../services/audio';
  import { keepScreenOn } from '../services/wakeLock';

  // The store clears the session in the same tick it leaves this screen; keep the
  // last one so the outgoing render never sees null.
  const initial = app.session!;
  const session = $derived(app.session ?? initial);
  const isTest = $derived(session.type === 'D');

  let now = $state(Date.now());
  let testResult = $state(app.program?.currentMax ?? 10);
  let saving = $state(false);

  onMount(() => keepScreenOn());

  /** Repaint interval for the rest ring: smooth enough, without re-rendering at 60 fps for minutes. */
  const PAINT_MS = 100;

  // Countdown: the source of truth is restEndsAt, so a frozen/backgrounded app
  // shows the right time the moment it is visible again.
  $effect(() => {
    if (session.phase !== 'rest') return;
    let frame = 0;
    let lastSecond = Infinity;
    let lastPaint = 0;

    const tick = () => {
      const t = Date.now();
      const remaining = restRemainingMs(session, t);
      const second = Math.ceil(remaining / 1000);
      if (second !== lastSecond || t - lastPaint >= PAINT_MS) {
        now = t;
        lastPaint = t;
      }
      if (second !== lastSecond && second <= 3 && second > 0 && lastSecond !== Infinity && app.settings.soundOn) {
        playTick();
      }
      lastSecond = second;
      if (remaining <= 0) app.restElapsed();
      else frame = requestAnimationFrame(tick);
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        cancelAnimationFrame(frame);
        lastSecond = Infinity;
        tick();
      }
    };

    tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', onVisible);
    };
  });

  const remaining = $derived(restRemainingMs(session, now));
  const lastSet = $derived(session.sets[session.sets.length - 1]);
  const restTotal = $derived(
    session.restEndsAt !== null && session.restStartedAt !== null ? session.restEndsAt - session.restStartedAt : 1,
  );

  async function close() {
    const started = session.sets.length > 0;
    const ok = await ask(
      started ? 'End this workout? It won’t count, and it stays next in your cycle.' : 'Leave this workout?',
      { confirmLabel: started ? 'End workout' : 'Leave', danger: started },
    );
    if (ok) app.abandonWorkout();
  }

  async function saveResult() {
    if (!isValidMax(testResult) || saving) return;
    saving = true;
    try {
      await app.submitTestResult(testResult);
    } finally {
      saving = false;
    }
  }
</script>

<div class="workout">
  <header>
    <div>
      <p class="eyebrow">Cycle {session.cycle}{session.deload ? ' · Lighter' : ''}</p>
      <h1>{workoutName(session.type)}</h1>
    </div>
    <button class="icon-btn" aria-label="End workout" onclick={close}>
      <Icon name="close" size={22} />
    </button>
  </header>

  {#if !isTest}
    <div class="progress">
      <SetPills planned={session.planned} current={session.setIndex} />
    </div>
  {/if}

  {#if session.phase === 'set'}
    <main class="stage">
      {#if isTest}
        <p class="eyebrow">One set · as many as you can</p>
        <p class="target test">MAX</p>
        <p class="hint">Warm up first. Keep full range and a straight body. Stop when your form breaks.</p>
      {:else}
        <p class="eyebrow">Set {session.setIndex + 1} of {session.planned.length}</p>
        <p class="target num">{session.planned[session.setIndex]}</p>
        <p class="unit">push-ups</p>
        {#if session.lastRestSec !== null}
          <p class="hint">Rested {session.lastRestSec}s</p>
        {/if}
      {/if}
    </main>
    <footer>
      <button class="btn btn-primary btn-lg btn-block done" onclick={() => app.done()}>
        <Icon name="check" size={26} stroke={2.5} />
        {isTest ? 'Finished' : 'Done'}
      </button>
    </footer>
  {:else if session.phase === 'rest'}
    <main class="stage">
      <RestRing remainingMs={remaining} totalMs={restTotal} />
      {#if lastSet}
        <p class="why">
          After <span class="num">{lastSet.planned}</span> push-ups ·
          <span class="num">{Math.round(setIntensity(lastSet.planned, session.maxBefore) * 100)}%</span> of your max
        </p>
      {/if}
      <p class="next">
        Next: <strong class="num">{session.planned[session.setIndex]}</strong> push-ups
      </p>
    </main>
    <footer>
      <div class="rest-controls">
        <button class="btn" onclick={() => app.adjustRest(-15)}>−15s</button>
        <button class="btn btn-primary" onclick={() => app.skipRest()}>
          <Icon name="skip" size={18} /> Skip
        </button>
        <button class="btn" onclick={() => app.adjustRest(15)}>+15s</button>
      </div>
      <button class="btn btn-ghost btn-block" onclick={() => app.undo()}>
        <Icon name="undo" size={18} /> Undo last set
      </button>
    </footer>
  {:else}
    <main class="stage">
      <p class="eyebrow">How many did you do?</p>
      <div class="result">
        <Stepper bind:value={testResult} min={1} max={MAX_REPS_LIMIT} big label="push-ups" />
      </div>
      {#if app.program}
        <p class="hint">Previous max: <span class="num">{app.program.currentMax}</span></p>
      {/if}
    </main>
    <footer>
      <button class="btn btn-primary btn-lg btn-block" disabled={saving || !isValidMax(testResult)} onclick={saveResult}>
        Save result
      </button>
      <button class="btn btn-ghost btn-block" onclick={() => app.undo()}>
        <Icon name="undo" size={18} /> Back to the test
      </button>
    </footer>
  {/if}
</div>

<style>
  .workout {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: calc(var(--safe-top) + 12px) var(--gutter) calc(var(--safe-bottom) + 16px);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 700;
  }

  .progress {
    margin-top: 20px;
  }

  .stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    min-height: 0;
  }

  .target {
    font-size: clamp(140px, 48vw, 220px);
    font-weight: 800;
    line-height: 0.9;
    letter-spacing: -0.05em;
  }

  .target.test {
    font-family: var(--font-display);
    font-size: clamp(88px, 30vw, 140px);
    color: var(--accent-text);
  }

  .unit {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-2);
  }

  .hint {
    max-width: 300px;
    margin-top: 12px;
    color: var(--text-2);
    font-size: calc(15 * var(--pt));
  }

  .why {
    margin-top: 12px;
    color: var(--text-3);
    font-size: calc(14 * var(--pt));
  }

  .next {
    margin-top: 4px;
    font-size: calc(18 * var(--pt));
    color: var(--text-2);
  }

  .next strong {
    color: var(--text);
    font-size: 22px;
  }

  .result {
    width: 100%;
    max-width: 340px;
    margin: 8px 0;
  }

  footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .done {
    min-height: 76px;
    font-size: 22px;
  }

  .rest-controls {
    display: grid;
    grid-template-columns: 1fr 1.4fr 1fr;
    gap: 8px;
  }

  .rest-controls .btn {
    min-height: 60px;
    font-size: 17px;
  }

  /* Phone on its side: the plan on top, the number on the left, the buttons on the right. */
  @media (orientation: landscape) and (max-height: 500px) {
    .workout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(240px, 34%);
      grid-template-rows: auto auto minmax(0, 1fr);
      grid-template-areas:
        'header header'
        'progress progress'
        'stage footer';
      column-gap: 24px;
    }

    header {
      grid-area: header;
    }

    .progress {
      grid-area: progress;
      margin-top: 10px;
    }

    .stage {
      grid-area: stage;
      gap: 4px;
      --ring-size: min(44dvh, 220px);
    }

    footer {
      grid-area: footer;
      justify-content: center;
    }

    .target {
      font-size: clamp(72px, 34dvh, 140px);
    }

    .target.test {
      font-size: clamp(56px, 24dvh, 120px);
    }

    .hint,
    .why {
      margin-top: 4px;
    }

    .done {
      min-height: 64px;
    }
  }
</style>
