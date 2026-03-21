import { createEmojiStamp } from '@/features/emoji-draw/model/emoji-bomb';
import {
  createTruckMoveEffect,
  hasTruckMoveDelta,
  isTruckEmoji,
  isTruckStamp,
} from '@/features/emoji-draw/model/emoji-truck';
import { TRUCK_EMOJI } from '@/features/emoji-draw/model/types';

describe('emoji truck helpers', () => {
  test('recognizes truck emoji and stamp kind', () => {
    const stamp = createEmojiStamp({
      id: 'truck-1',
      emoji: TRUCK_EMOJI,
      size: 48,
      point: { x: 120, y: 140 },
      nowMs: 300,
    });

    expect(isTruckEmoji(TRUCK_EMOJI)).toBe(true);
    expect(isTruckEmoji('😀')).toBe(false);
    expect(isTruckStamp(stamp)).toBe(true);
  });

  test('builds move effect from first point and drag delta', () => {
    const effect = createTruckMoveEffect({
      id: 'move:1',
      size: 40,
      anchor: { x: 80, y: 100 },
      current: { x: 126, y: 132 },
    });

    expect(effect).toEqual(
      expect.objectContaining({
        id: 'move:1',
        x: 80,
        y: 100,
        deltaX: 46,
        deltaY: 32,
      })
    );
    expect(effect.radius).toBe(20);
  });

  test('uses selected emoji size as truck move diameter', () => {
    const small = createTruckMoveEffect({
      id: 'move:small',
      size: 24,
      anchor: { x: 120, y: 120 },
      current: { x: 130, y: 130 },
    });
    const large = createTruckMoveEffect({
      id: 'move:large',
      size: 88,
      anchor: { x: 120, y: 120 },
      current: { x: 130, y: 130 },
    });

    expect(small.radius).toBe(12);
    expect(large.radius).toBe(44);
  });

  test('ignores micro-jitter drags', () => {
    expect(
      hasTruckMoveDelta({
        id: 'move:jitter',
        x: 0,
        y: 0,
        radius: 100,
        deltaX: 0.2,
        deltaY: 0.1,
      })
    ).toBe(false);

    expect(
      hasTruckMoveDelta({
        id: 'move:real',
        x: 0,
        y: 0,
        radius: 100,
        deltaX: 2,
        deltaY: 1,
      })
    ).toBe(true);
  });
});
