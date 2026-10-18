/**
 * Keeps the screen on during a workout. iOS releases the lock whenever the app
 * is hidden, so it is re-acquired on every return to the foreground.
 */
export function keepScreenOn(): () => void {
  let sentinel: WakeLockSentinel | null = null;
  let active = true;

  const held = () => sentinel !== null && !sentinel.released;

  async function acquire() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || held()) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      // Released on cleanup, or a parallel request already holds one: don't leak a second lock
      // that cleanup would never release (the screen would then stay on after the workout).
      if (!active || held()) {
        await lock.release();
        return;
      }
      sentinel = lock;
    } catch {
      // Denied (e.g. low power mode). The workout still works, the screen may dim.
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') acquire();
  }

  acquire();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    sentinel?.release().catch(() => {});
    sentinel = null;
  };
}
