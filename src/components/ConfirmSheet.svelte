<script lang="ts">
  import { confirmStore } from '../lib/confirm.svelte';

  let dialog: HTMLDialogElement;
  const request = $derived(confirmStore.request);

  // A modal <dialog> keeps focus inside and makes the page behind it inert.
  $effect(() => {
    if (request && !dialog.open) dialog.showModal();
    else if (!request && dialog.open) dialog.close();
  });

  /** Closed by Escape or a tap on the backdrop: counts as Cancel. */
  function onClose() {
    if (confirmStore.request) confirmStore.answer(false);
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === dialog) dialog.close();
  }
</script>

<dialog bind:this={dialog} aria-labelledby="confirm-message" onclose={onClose} onclick={onBackdrop}>
  {#if request}
    <div class="body">
      <p id="confirm-message">{request.message}</p>
      <div class="actions">
        <button
          class="btn btn-lg btn-block"
          class:btn-primary={!request.danger}
          class:destructive={request.danger}
          onclick={() => confirmStore.answer(true)}
        >
          {request.confirmLabel}
        </button>
        <button class="btn btn-lg btn-block" onclick={() => confirmStore.answer(false)}>Cancel</button>
      </div>
    </div>
  {/if}
</dialog>

<style>
  dialog {
    width: min(100% - 2 * var(--gutter), 420px);
    max-width: none;
    margin: auto auto calc(var(--safe-bottom) + 16px);
    padding: 0;
    border: 0;
    border-radius: 24px;
    background: var(--surface);
    color: var(--text);
  }

  dialog[open] {
    animation: rise 0.22s ease-out;
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px 16px 16px;
  }

  p {
    padding: 0 8px;
    font-size: calc(17 * var(--pt));
    font-weight: 600;
    line-height: 1.35;
    text-align: center;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .destructive {
    background: var(--danger);
    color: #fff;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }
</style>
