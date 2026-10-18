import type { WorkoutType } from '../core/types';
import { daysBetween } from '../core/program';

export function workoutName(type: WorkoutType): string {
  return type === 'D' ? 'Max test' : `Workout ${type}`;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Seconds as m:ss. */
export function formatSec(sec: number): string {
  return formatClock(sec * 1000);
}

/** "2:00–2:40", or a single value when every rest is the same. */
export function formatRestRange(rests: number[]): string {
  if (rests.length === 0) return '';
  const lo = Math.min(...rests);
  const hi = Math.max(...rests);
  return lo === hi ? formatSec(lo) : `${formatSec(lo)}–${formatSec(hi)}`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** "today", "tomorrow", or "Tue, Oct 20". */
export function formatRelativeDay(ts: number, now = Date.now()): string {
  const diff = daysBetween(now, ts);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return formatDate(ts);
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'under a minute';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}
