<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { DEFAULT_COEFFICIENTS, planSets } from '../core/program';
  import { REST_MAX_SEC, REST_MIN_SEC, restPlan } from '../core/rest';
  import type { Coefficients, TrainingType } from '../core/types';
  import { BackupError, backupFileName, createBackup, parseBackup } from '../data/backup';
  import { app } from '../lib/app.svelte';
  import { ask } from '../lib/confirm.svelte';
  import { formatSec } from '../lib/format';
  import { isStoragePersisted, requestPersistentStorage, shareFile } from '../services/device';

  const TYPES: TrainingType[] = ['A', 'B', 'C'];

  // Safari 17.4+ draws a native iOS switch (with haptics) for <input type="checkbox" switch>.
  const nativeSwitch = 'switch' in HTMLInputElement.prototype ? { switch: true } : {};

  // Percent values edited as strings so a half-typed number doesn't jump around.
  let coeffs = $state(toPercent(app.settings.coefficients));
  let coeffsOpen = $state(false);

  function toPercent(c: Coefficients): Record<TrainingType, string[]> {
    return { A: c.A.map(pct), B: c.B.map(pct), C: c.C.map(pct) };
  }

  function pct(v: number): string {
    return String(Math.round(v * 100));
  }

  function commitCoeff(type: TrainingType, i: number) {
    const n = Number(coeffs[type][i]);
    const valid = Number.isFinite(n) && n >= 5 && n <= 150;
    const next = app.settings.coefficients[type].slice();
    if (valid) next[i] = Math.round(n) / 100;
    coeffs[type][i] = pct(next[i]);
    if (valid) app.updateSettings({ coefficients: { ...app.settings.coefficients, [type]: next } });
  }

  async function resetCoeffs() {
    if (!(await ask('Restore the default plan percentages?', { confirmLabel: 'Restore' }))) return;
    app.updateSettings({ coefficients: DEFAULT_COEFFICIENTS });
    coeffs = toPercent(DEFAULT_COEFFICIENTS);
  }

  let persisted = $state<boolean | null>(null);
  isStoragePersisted().then((p) => (persisted = p));

  async function protectStorage() {
    persisted = await requestPersistentStorage();
  }

  let message = $state('');
  let fileInput: HTMLInputElement;

  async function exportData() {
    try {
      const backup = await createBackup();
      const result = await shareFile(backupFileName(), JSON.stringify(backup, null, 2));
      if (result !== 'cancelled') message = `Backup ready: ${backup.workouts.length} workouts.`;
    } catch (err) {
      console.error(err);
      message = 'Could not create the backup.';
    }
  }

  async function importData(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const ok = await ask(
        `Replace all data with this backup (${backup.workouts.length} workouts${backup.exportedAt ? `, ${backup.exportedAt.slice(0, 10)}` : ''})?`,
        { confirmLabel: 'Replace', danger: true },
      );
      if (!ok) return;
      await app.importBackup(backup);
      coeffs = toPercent(app.settings.coefficients);
      message = 'Backup restored.';
    } catch (err) {
      message = err instanceof BackupError ? err.message : 'Could not read this file.';
    }
  }

  async function reset() {
    const ok = await ask('Delete all workouts and start over? Export a backup first if you want to keep them.', {
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (ok) app.resetEverything();
  }

  const sample = $derived(app.program?.currentMax ?? 20);
</script>

<div class="screen">
  <header>
    <h1>Settings</h1>
  </header>

  <section>
    <h2 class="eyebrow">Workout</h2>
    <div class="card group">
      <div class="item column">
        <div class="rest-head">
          <span class="label">Rest between sets</span>
          <span class="muted">Adaptive · {formatSec(REST_MIN_SEC)}–{formatSec(REST_MAX_SEC)}</span>
        </div>
        <p class="muted small">
          Longer after sets with more reps and sets closer to your max, plus a little more as the workout goes on. Use
          ±15s during a rest to fine-tune it.
        </p>
        <div class="rest-example">
          {#each TYPES as type (type)}
            {@const sets = planSets(sample, app.settings.coefficients[type])}
            <div class="rest-row">
              <span class="plan-type">{type}</span>
              <span class="num rests">{restPlan(sets, sample).map(formatSec).join(' · ')}</span>
            </div>
          {/each}
          <p class="muted small">Your rests at max {sample}</p>
        </div>
      </div>
      <label class="item">
        <span>
          <span class="label">Sounds</span>
          <span class="muted small block">Beeps play over your music and are muted in Silent mode.</span>
        </span>
        <input
          type="checkbox"
          class="switch"
          {...nativeSwitch}
          checked={app.settings.soundOn}
          onchange={(e) => app.updateSettings({ soundOn: e.currentTarget.checked })}
        />
      </label>
    </div>
  </section>

  <section>
    <h2 class="eyebrow">Plan</h2>
    <div class="card group">
      <button class="item disclosure" aria-expanded={coeffsOpen} onclick={() => (coeffsOpen = !coeffsOpen)}>
        <span>
          <span class="label">Set percentages</span>
          <span class="muted small block">Each set is a percentage of your max</span>
        </span>
        <Icon name={coeffsOpen ? 'up' : 'down'} size={20} />
      </button>
      {#if coeffsOpen}
        {#each TYPES as type (type)}
          <div class="item column">
            <div class="coeff-head">
              <span class="label">Workout {type}</span>
              <span class="muted small num">
                max {sample} → {planSets(sample, app.settings.coefficients[type]).join(' · ')}
              </span>
            </div>
            <div class="coeffs">
              {#each coeffs[type] as _, i (i)}
                <label>
                  <span class="sr">Workout {type} set {i + 1} percent</span>
                  <input
                    class="num"
                    inputmode="numeric"
                    bind:value={coeffs[type][i]}
                    onblur={() => commitCoeff(type, i)}
                    onfocus={(e) => e.currentTarget.select()}
                  />
                  <span class="pct">%</span>
                </label>
              {/each}
            </div>
          </div>
        {/each}
        <button class="item btn-row" onclick={resetCoeffs}>Restore defaults</button>
      {/if}
    </div>
  </section>

  <section>
    <h2 class="eyebrow">Data</h2>
    <div class="card group">
      <button class="item btn-row" onclick={exportData}>
        <Icon name="share" size={20} /> Export backup
      </button>
      <button class="item btn-row" onclick={() => fileInput.click()}>
        <Icon name="import" size={20} /> Import backup
      </button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={importData} />
      <div class="item">
        <span>
          <span class="label">Protected storage</span>
          <span class="muted small block">
            {persisted ? 'iOS won’t clear your data to free space.' : 'Data may be cleared under storage pressure.'}
          </span>
        </span>
        {#if persisted === false}
          <button class="btn" onclick={protectStorage}>Enable</button>
        {:else if persisted}
          <span class="ok"><Icon name="check" size={20} /></span>
        {/if}
      </div>
    </div>
    {#if message}<p class="message" role="status">{message}</p>{/if}
    <p class="muted small note">
      Your data lives only on this iPhone. Deleting the app icon deletes it too — export a backup to Files from time to time.
    </p>
  </section>

  <section>
    <div class="card group">
      <button class="item btn-row danger" onclick={reset}>Reset all data</button>
    </div>
    {#if !app.standalone}
      <p class="muted small note">
        Running in Safari. For the full app, tap ••• → Share → Add to Home Screen and open it from the icon.
      </p>
    {/if}
    <p class="muted small note">Push-Ups v{__APP_VERSION__}</p>
  </section>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    gap: 24px;
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

  .group {
    padding: 0 16px;
  }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 12px 0;
    border: 0;
    background: none;
    text-align: left;
    font-size: calc(16 * var(--pt));
  }

  .item + .item {
    border-top: 0.5px solid var(--line);
  }

  .item.column {
    flex-direction: column;
    align-items: stretch;
  }

  .label {
    font-weight: 600;
  }

  .small {
    font-size: calc(13 * var(--pt));
  }

  .block {
    display: block;
  }

  .btn-row {
    justify-content: flex-start;
    color: var(--accent-text);
    font-weight: 600;
  }

  .btn-row.danger {
    color: var(--danger);
  }

  .disclosure {
    color: var(--text);
  }

  .rest-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }

  .rest-example {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }

  .rest-row {
    display: grid;
    grid-template-columns: 20px 1fr;
    gap: 8px;
    font-size: 15px;
  }

  .plan-type {
    font-weight: 700;
    color: var(--text-2);
  }

  .rests {
    font-weight: 600;
  }

  .coeff-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .coeffs {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .coeffs label {
    position: relative;
  }

  .coeffs input {
    width: 100%;
    height: 44px;
    padding: 0 14px 0 6px;
    border: 0;
    border-radius: 10px;
    background: var(--surface-2);
    text-align: center;
    font-size: 16px;
    font-weight: 600;
    outline: none;
  }

  .coeffs input:focus {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .pct {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--text-3);
    pointer-events: none;
  }

  .switch[switch] {
    flex: none;
    margin: 0;
    accent-color: var(--accent);
  }

  /* Fallback look where the native switch isn't supported. */
  .switch:not([switch]) {
    appearance: none;
    position: relative;
    flex: none;
    width: 51px;
    height: 31px;
    margin: 0;
    border-radius: 999px;
    background: var(--surface-2);
    transition: background 0.2s;
  }

  .switch:not([switch])::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 27px;
    height: 27px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 4px rgb(0 0 0 / 0.25);
    transition: transform 0.2s;
  }

  .switch:not([switch]):checked {
    background: var(--accent);
  }

  .switch:not([switch]):checked::after {
    transform: translateX(20px);
  }

  .ok {
    color: var(--accent-text);
  }

  .message {
    margin: 10px 4px 0;
    font-weight: 600;
  }

  .note {
    margin: 10px 4px 0;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
