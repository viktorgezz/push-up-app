export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  /** The action deletes or discards something: the button is drawn red. */
  danger: boolean;
  resolve: (ok: boolean) => void;
}

class ConfirmStore {
  request = $state.raw<ConfirmRequest | null>(null);

  answer(ok: boolean) {
    const request = this.request;
    this.request = null;
    request?.resolve(ok);
  }
}

export const confirmStore = new ConfirmStore();

/**
 * In-app replacement for window.confirm(): in a Home Screen app the system alert
 * carries the site's address as its title. Rendered by ConfirmSheet in App.svelte.
 */
export function ask(message: string, { confirmLabel = 'OK', danger = false } = {}): Promise<boolean> {
  confirmStore.answer(false);
  return new Promise((resolve) => {
    confirmStore.request = { message, confirmLabel, danger, resolve };
  });
}
