import {
  appendConcurrentSwirls,
  coalesceSwirls,
  createSwirlEffect,
  getSwirlVisualProgress,
  isSwirlEmoji,
  isSwirlStamp,
  resolveSwirlEffects,
} from '@/features/emoji-draw/model/emoji-swirl';
import { createEmojiStamp } from '@/features/emoji-draw/model/emoji-bomb';
import { SWIRL_EMOJI, type SwirlEffect } from '@/features/emoji-draw/model/types';

describe('emoji swirl helpers', () => {
  test('recognizes swirl emoji and stamp kind', () => {
    const stamp = createEmojiStamp({
      id: 'swirl-1',
      emoji: SWIRL_EMOJI,
      size: 48,
      point: { x: 90, y: 110 },
      nowMs: 500,
    });

    expect(isSwirlEmoji(SWIRL_EMOJI)).toBe(true);
    expect(isSwirlEmoji('😀')).toBe(false);
    expect(isSwirlStamp(stamp)).toBe(true);
  });

  test('creates swirl effect centered on stamp and sized to canvas', () => {
    const stamp = createEmojiStamp({
      id: 'swirl-2',
      emoji: SWIRL_EMOJI,
      size: 48,
      point: { x: 120, y: 220 },
      nowMs: 1200,
    });

    const effect = createSwirlEffect(stamp, 3000, { width: 320, height: 440 });

    expect(effect).toEqual(
      expect.objectContaining({
        id: 'swirl:swirl-2',
        x: 120,
        y: 220,
        startedAtMs: 3000,
      })
    );
    expect(effect.durationMs).toBeGreaterThan(0);
    expect(effect.maxRadius).toBeGreaterThan(220);
  });

  test('keeps active swirls and marks completed ones', () => {
    const effect: SwirlEffect = {
      id: 'swirl:test',
      x: 100,
      y: 120,
      startedAtMs: 1000,
      durationMs: 800,
      maxRadius: 300,
      spinTurns: 1.15,
    };

    const active = resolveSwirlEffects([effect], 1700);
    const completed = resolveSwirlEffects([effect], 1801);

    expect(active.activeEffects).toHaveLength(1);
    expect(active.completedEffects).toHaveLength(0);
    expect(completed.activeEffects).toHaveLength(0);
    expect(completed.completedEffects).toEqual([effect]);
  });

  test('coalesces swirls created close together in time', () => {
    const first: SwirlEffect = {
      id: 'swirl:a',
      x: 120,
      y: 140,
      startedAtMs: 2000,
      durationMs: 800,
      maxRadius: 260,
      spinTurns: 1.05,
    };
    const second: SwirlEffect = {
      id: 'swirl:b',
      x: 240,
      y: 260,
      startedAtMs: 2050,
      durationMs: 900,
      maxRadius: 320,
      spinTurns: 1.2,
    };

    const merged = coalesceSwirls([], [first, second], 80);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(
      expect.objectContaining({
        x: 120,
        y: 140,
        startedAtMs: 2000,
        maxRadius: 320,
        durationMs: 900,
      })
    );
  });

  test('keeps close-timed swirls concurrent when appending generations', () => {
    const first: SwirlEffect = {
      id: 'swirl:first',
      x: 120,
      y: 140,
      startedAtMs: 2000,
      durationMs: 800,
      maxRadius: 260,
      spinTurns: 1.05,
    };
    const second: SwirlEffect = {
      id: 'swirl:second',
      x: 125,
      y: 146,
      startedAtMs: 2030,
      durationMs: 820,
      maxRadius: 268,
      spinTurns: 1.1,
    };

    const appended = appendConcurrentSwirls([first], [second], 6);
    expect(appended).toHaveLength(2);
    expect(appended[0].id).toBe('swirl:first');
    expect(appended[1].id).toBe('swirl:second');
  });

  test('uses monotonic visual progress so swirl never rewinds', () => {
    const effect: SwirlEffect = {
      id: 'swirl:progress',
      x: 80,
      y: 100,
      startedAtMs: 1000,
      durationMs: 800,
      maxRadius: 260,
      spinTurns: 1.2,
    };

    const p0 = getSwirlVisualProgress(effect, 1000);
    const p1 = getSwirlVisualProgress(effect, 1200);
    const p2 = getSwirlVisualProgress(effect, 1500);
    const p3 = getSwirlVisualProgress(effect, 1800);

    expect(p0).toBeCloseTo(0);
    expect(p1).toBeGreaterThanOrEqual(p0);
    expect(p2).toBeGreaterThanOrEqual(p1);
    expect(p3).toBeCloseTo(1);
  });

  test('scales swirl strength with placed swirl emoji size', () => {
    const small = createEmojiStamp({
      id: 'swirl-small',
      emoji: SWIRL_EMOJI,
      size: 28,
      point: { x: 160, y: 160 },
      nowMs: 0,
    });
    const large = createEmojiStamp({
      id: 'swirl-large',
      emoji: SWIRL_EMOJI,
      size: 92,
      point: { x: 160, y: 160 },
      nowMs: 0,
    });

    const smallEffect = createSwirlEffect(small, 1000, { width: 320, height: 320 });
    const largeEffect = createSwirlEffect(large, 1000, { width: 320, height: 320 });

    expect(largeEffect.spinTurns).toBeGreaterThan(smallEffect.spinTurns);
  });
});
