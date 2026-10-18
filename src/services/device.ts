/** Launched from the Home Screen icon (not a Safari tab). Safari tabs have separate storage on iOS. */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** Ask the browser not to evict our IndexedDB data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

/**
 * Hand a file to the iOS share sheet ("Save to Files", AirDrop, iCloud).
 * Falls back to a regular download where file sharing is unavailable.
 */
export async function shareFile(name: string, text: string, type = 'application/json'): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
