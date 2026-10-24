/**
 * Short synthesized beeps (no audio files). iOS only allows audio after a user
 * gesture, so unlock() must be called from a tap handler (e.g. Start workout).
 */
let ctx: AudioContext | null = null;

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

export function unlockAudio() {
  // 'ambient' mixes the beeps into music from other apps (Spotify etc.); 'playback' would pause it.
  // The price: like game sounds, the beeps are muted in Silent mode.
  const nav = navigator as Navigator & AudioSessionNavigator;
  if (nav.audioSession) nav.audioSession.type = 'ambient';

  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return; // No Web Audio: the workout runs silently.
    }
  }
  resume(ctx);
}

/** iOS moves the context to the non-standard 'interrupted' state after backgrounding or a call, not only 'suspended'. */
function resume(c: AudioContext) {
  if (c.state !== 'running' && c.state !== 'closed') c.resume().catch(() => {});
}

function tone(freq: number, durationMs: number, delayMs = 0, volume = 0.25) {
  if (!ctx) return;
  resume(ctx);

  const start = ctx.currentTime + delayMs / 1000;
  const end = start + durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(ctx.destination);
  // Detach finished nodes so every beep doesn't leave a node in the audio graph.
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
  osc.start(start);
  osc.stop(end + 0.02);
}

/** 3-2-1 countdown tick. */
export const playTick = () => tone(880, 120);

/** Rest is over. */
export function playGo() {
  tone(1320, 180);
  tone(1320, 320, 220);
}

/** A set was confirmed. */
export const playDone = () => tone(660, 90, 0, 0.15);
