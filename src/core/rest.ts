/**
 * Adaptive rest between sets.
 *
 * Heuristic, from the rest-interval literature:
 * - Recovery needed grows with how much work the set took AND how close it was to
 *   failure. High-rep sets recover slower than short heavy ones (Senna et al. 2017:
 *   at 50% 1RM reps still improved from 3 to 5 min rest; at 80% 1RM 3 min = 5 min).
 * - 3 min preserves far more reps on upper-body compound lifts than 1 min, and
 *   phosphocreatine is only ~84% restored after 3 min, so a long set warrants up to 5 min.
 * - Fatigue accumulates over a session (RPE rises in later sets), so each further set
 *   adds a little.
 *
 * Model: intensity = reps / max. Effective reps = intensity² × (max − 25): a set close to
 * your max counts in full, an easy set counts less, and the first 25 reps of your max
 * add no rest (anyone with a max up to 25 rests the minimum). Rest = 90 s + 5 s per
 * effective rep, +5% per set already done, rounded to 5 s and kept within 1:30–5:00.
 */
export const REST_MIN_SEC = 90;
export const REST_MAX_SEC = 300;
export const REST_SEC_PER_EFFECTIVE_REP = 5;
export const REST_FATIGUE_PER_SET = 0.05;
/** Max (reps) below which the rest stays at the minimum; shifts the whole curve. */
export const REST_MAX_OFFSET = 25;

/** How hard a set is relative to the current max (0..1). */
export function setIntensity(reps: number, max: number): number {
  return max > 0 ? Math.min(1, reps / max) : 1;
}

/**
 * @param reps     reps in the set that was just completed
 * @param max      current max (M)
 * @param setIndex 0-based index of that set in the workout
 */
export function restAfterSet(reps: number, max: number, setIndex: number): number {
  const intensity = setIntensity(reps, max);
  const effectiveReps = intensity * intensity * Math.max(0, max - REST_MAX_OFFSET);
  const fatigue = 1 + REST_FATIGUE_PER_SET * Math.max(0, setIndex);
  const raw = REST_MIN_SEC + REST_SEC_PER_EFFECTIVE_REP * effectiveReps * fatigue;
  const rounded = Math.round(raw / 5) * 5;
  return Math.min(REST_MAX_SEC, Math.max(REST_MIN_SEC, rounded));
}

/** Rest after every set except the last one. */
export function restPlan(planned: number[], max: number): number[] {
  return planned.slice(0, -1).map((reps, i) => restAfterSet(reps, max, i));
}
