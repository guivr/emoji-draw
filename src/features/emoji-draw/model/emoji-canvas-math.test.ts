import {
    clampBrushSize,
    createInterpolatedStamps,
    shouldStampFromDistance,
} from '@/features/emoji-draw/model/emoji-canvas-math';

describe('emoji canvas math', () => {
  describe('clampBrushSize', () => {
    test('clamps to min and max', () => {
      expect(clampBrushSize(4, 16, 88)).toBe(16);
      expect(clampBrushSize(99, 16, 88)).toBe(88);
      expect(clampBrushSize(44, 16, 88)).toBe(44);
    });
  });

  describe('shouldStampFromDistance', () => {
    test('returns true when drag distance exceeds spacing threshold', () => {
      const result = shouldStampFromDistance(
        { x: 20, y: 20 },
        { x: 60, y: 20 },
        24,
        0.65
      );

      expect(result).toBe(true);
    });

    test('returns false when drag distance is too short', () => {
      const result = shouldStampFromDistance(
        { x: 20, y: 20 },
        { x: 28, y: 20 },
        24,
        0.65
      );

      expect(result).toBe(false);
    });
  });

  describe('createInterpolatedStamps', () => {
    test('creates a stable sequence from point A to B', () => {
      const stamps = createInterpolatedStamps(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        20,
        0.5
      );

      expect(stamps.length).toBeGreaterThan(0);
      expect(stamps[0]).toEqual({ x: 10, y: 0 });
      expect(stamps[stamps.length - 1]).toEqual({ x: 100, y: 0 });
    });

    test('returns empty list for identical points', () => {
      const stamps = createInterpolatedStamps(
        { x: 15, y: 30 },
        { x: 15, y: 30 },
        20,
        0.5
      );

      expect(stamps).toEqual([]);
    });
  });
});
