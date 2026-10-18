<script lang="ts">
  import SetPills from '../components/SetPills.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { MAX_REPS_LIMIT, isValidMax, planSets } from '../core/program';
  import type { TrainingType } from '../core/types';
  import { app } from '../lib/app.svelte';

  type Step = 'welcome' | 'install' | 'test' | 'plan';
  let step = $state<Step>('welcome');
  let max = $state(10);
  let saving = $state(false);

  const types: TrainingType[] = ['A', 'B', 'C'];
  const valid = $derived(isValidMax(max));

  function begin() {
    step = app.standalone ? 'test' : 'install';
  }

  async function finish() {
    if (!valid || saving) return;
    saving = true;
    try {
      await app.completeOnboarding(max);
      app.go('today');
    } finally {
      saving = false;
    }
  }
</script>

<div class="onboarding">
  {#if step === 'welcome'}
    <main>
      <div class="logo" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <path d="M12 40 32 22l20 18" />
          <path d="M12 54 32 36l20 18" opacity="0.5" />
        </svg>
      </div>
      <h1>Grow your<br />push-up max</h1>
      <p class="lead">
        Short cycles of four workouts. Three build volume, the fourth tests your max — and the next cycle is
        rebuilt from what you can actually do.
      </p>
      <ol class="cycle">
        <li><strong>A</strong><span>Base</span></li>
        <li><strong>B</strong><span>Harder</span></li>
        <li><strong>C</strong><span>Peak</span></li>
        <li><strong>Test</strong><span>New max</span></li>
      </ol>
    </main>
    <footer>
      <button class="btn btn-primary btn-lg btn-block" onclick={begin}>Get started</button>
    </footer>
  {:else if step === 'install'}
    <main>
      <h1>Add to Home Screen</h1>
      <p class="lead">
        Your workouts are stored on this iPhone. Open the app from its Home Screen icon — Safari tabs keep a separate copy
        of the data and can clear it.
      </p>
      <ol class="steps card">
        <li>
          <span class="n">1</span>
          <span>Tap <strong>•••</strong> next to the address bar, then <strong>Share</strong> (on older iOS, Share is in the toolbar)</span>
        </li>
        <li>
          <span class="n">2</span>
          <span>Choose <strong>Add to Home Screen</strong> — under <strong>View More</strong> if it isn’t listed</span>
        </li>
        <li>
          <span class="n">3</span>
          <span>Keep <strong>Open as Web App</strong> on, tap <strong>Add</strong> and open <strong>Push-Ups</strong> from the icon</span>
        </li>
      </ol>
    </main>
    <footer>
      <button class="btn btn-ghost btn-block" onclick={() => (step = 'test')}>Continue in Safari anyway</button>
    </footer>
  {:else if step === 'test'}
    <main>
      <p class="eyebrow">Starting point</p>
      <h1>What’s your max?</h1>
      <p class="lead">
        Warm up, then do as many push-ups as you can in one set with good form. Enter the number — or your best recent
        result if you already know it.
      </p>
      <div class="input">
        <Stepper bind:value={max} min={1} max={MAX_REPS_LIMIT} big label="max push-ups" />
      </div>
    </main>
    <footer>
      <button class="btn btn-primary btn-lg btn-block" disabled={!valid} onclick={() => (step = 'plan')}>Continue</button>
    </footer>
  {:else}
    <main>
      <p class="eyebrow">Cycle 1 · max {max}</p>
      <h1>Your first cycle</h1>
      <div class="plans card">
        {#each types as type (type)}
          {@const sets = planSets(max, app.settings.coefficients[type])}
          <div class="plan">
            <span class="plan-name">{type}</span>
            <SetPills planned={sets} />
          </div>
        {/each}
        <div class="plan">
          <span class="plan-name">D</span>
          <span class="muted">Max test</span>
        </div>
      </div>
      <p class="lead small">
        Rest adapts to each set — longer after big, hard sets (1:30 to 5:00). Take a day off between workouts. Tap
        <strong>Done</strong> after each set — that’s it.
      </p>
    </main>
    <footer>
      <button class="btn btn-primary btn-lg btn-block" disabled={saving} onclick={finish}>Let’s go</button>
      <button class="btn btn-ghost btn-block" onclick={() => (step = 'test')}>Change max</button>
    </footer>
  {/if}
</div>

<style>
  .onboarding {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: calc(var(--safe-top) + 32px) var(--gutter) calc(var(--safe-bottom) + 16px);
    overflow-y: auto;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  footer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 16px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 800;
    line-height: 1.08;
    letter-spacing: -0.02em;
  }

  .lead {
    color: var(--text-2);
    font-size: calc(17 * var(--pt));
  }

  .lead.small {
    font-size: calc(15 * var(--pt));
  }

  .lead strong {
    color: var(--text);
  }

  .logo {
    display: grid;
    place-items: center;
    width: 88px;
    height: 88px;
    margin: 24px 0 8px;
    border-radius: 24px;
    background: var(--accent);
  }

  .logo path {
    fill: none;
    stroke: var(--on-accent);
    stroke-width: 7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .cycle {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
  }

  .cycle li {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px 10px;
    border-radius: 14px;
    background: var(--surface);
  }

  .cycle li:last-child {
    background: var(--accent-soft);
  }

  .cycle strong {
    font-size: 20px;
  }

  .cycle span {
    font-size: 13px;
    color: var(--text-2);
  }

  .steps {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 8px 0 0;
    list-style: none;
  }

  .steps li {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .n {
    display: grid;
    place-items: center;
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
    font-size: 14px;
  }

  .input {
    margin-top: 24px;
  }

  .plans {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .plan {
    display: grid;
    grid-template-columns: 24px 1fr;
    align-items: center;
    gap: 10px;
    min-height: 40px;
  }

  .plan-name {
    font-weight: 700;
    color: var(--text-2);
  }

  /* Phone on its side: don't stretch text and buttons across the whole width. */
  main,
  footer {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
  }
</style>
