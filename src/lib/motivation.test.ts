import { describe, expect, it } from 'vitest';
import { MOTIVATION, randomMotivation } from './motivation';

describe('motivation', () => {
  it('has 100 distinct, non-empty phrases', () => {
    expect(MOTIVATION).toHaveLength(100);
    expect(new Set(MOTIVATION).size).toBe(100);
    expect(MOTIVATION.every((p) => p.trim().length > 0)).toBe(true);
  });

  it('picks across the whole list', () => {
    expect(randomMotivation(() => 0)).toBe(MOTIVATION[0]);
    expect(randomMotivation(() => 0.999999)).toBe(MOTIVATION[99]);
  });
});
