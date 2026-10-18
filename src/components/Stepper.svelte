<script lang="ts">
  import Icon from './Icon.svelte';

  let {
    value = $bindable(),
    min = 1,
    max = 999,
    step = 1,
    big = false,
    suffix = '',
    label,
  }: {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    big?: boolean;
    suffix?: string;
    label: string;
  } = $props();

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  function bump(delta: number) {
    value = clamp((Number.isFinite(value) ? value : min) + delta);
  }

  function onInput(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    // Drop non-digits from the field itself: when the number doesn't change, `value` won't repaint it.
    if (input.value !== raw) input.value = raw;
    value = raw === '' ? NaN : Number(raw);
  }

  function onBlur() {
    value = clamp(Number.isFinite(value) ? value : min);
  }
</script>

<div class="stepper" class:big>
  <button class="icon-btn" type="button" aria-label="Decrease {label}" disabled={value <= min} onclick={() => bump(-step)}>
    <Icon name="minus" />
  </button>
  <label class="field">
    <span class="sr">{label}</span>
    <input
      class="num"
      inputmode="numeric"
      pattern="[0-9]*"
      value={Number.isFinite(value) ? value : ''}
      oninput={onInput}
      onblur={onBlur}
      onfocus={(e) => e.currentTarget.select()}
    />
    {#if suffix}<span class="suffix">{suffix}</span>{/if}
  </label>
  <button class="icon-btn" type="button" aria-label="Increase {label}" disabled={value >= max} onclick={() => bump(step)}>
    <Icon name="plus" />
  </button>
</div>

<style>
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .icon-btn:disabled {
    opacity: 0.35;
  }

  .field {
    flex: 1;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
    min-width: 0;
  }

  input {
    width: 3.5ch;
    min-width: 0;
    border: 0;
    background: none;
    text-align: center;
    font-size: 28px;
    font-weight: 700;
    outline: none;
  }

  .suffix {
    color: var(--text-2);
    font-weight: 600;
  }

  .big .icon-btn {
    width: 64px;
    height: 64px;
  }

  .big input {
    width: 100%;
    font-size: 88px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
