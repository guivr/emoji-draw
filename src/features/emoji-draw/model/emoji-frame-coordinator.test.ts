import { flushQueuedPointsToFrame } from '@/features/emoji-draw/model/emoji-frame-coordinator';
import type { EmojiStamp } from '@/features/emoji-draw/model/types';
import { BOMB_BLAST_RADIUS, BOMB_EMOJI, BOMB_FUSE_MS } from '@/features/emoji-draw/model/types';

describe('emoji frame coordinator', () => {
  test('flushes queued points into stamp entries while advancing ids', () => {
    const activeStamps: EmojiStamp[] = [
      {
        id: '1',
        emoji: '😀',
        size: 32,
        x: 5,
        y: 10,
      },
    ];

    const result = flushQueuedPointsToFrame({
      activeStamps,
      queuedPoints: [
        { x: 15, y: 20 },
        { x: 25, y: 30 },
      ],
      emoji: '🔥',
      size: 40,
      nextId: 1,
      nowMs: 240,
      lastPlayedAtMs: 0,
      minPlayIntervalMs: 120,
    });

    expect(result.activeStamps).toEqual([
      activeStamps[0],
      { id: '2', emoji: '🔥', size: 40, x: 15, y: 20 },
      { id: '3', emoji: '🔥', size: 40, x: 25, y: 30 },
    ]);
    expect(result.newStamps).toEqual([
      { id: '2', emoji: '🔥', size: 40, x: 15, y: 20 },
      { id: '3', emoji: '🔥', size: 40, x: 25, y: 30 },
    ]);
    expect(result.nextId).toBe(3);
    expect(result.playback).toEqual({
      emoji: '🔥',
      stampCount: 2,
      playedAtMs: 240,
    });
  });

  test('still flushes drawing when audio is rate limited', () => {
    const result = flushQueuedPointsToFrame({
      activeStamps: [],
      queuedPoints: [
        { x: 12, y: 18 },
        { x: 20, y: 26 },
      ],
      emoji: '💥',
      size: 28,
      nextId: 0,
      nowMs: 180,
      lastPlayedAtMs: 120,
      minPlayIntervalMs: 120,
    });

    expect(result.activeStamps).toEqual([
      { id: '1', emoji: '💥', size: 28, x: 12, y: 18 },
      { id: '2', emoji: '💥', size: 28, x: 20, y: 26 },
    ]);
    expect(result.newStamps).toEqual([
      { id: '1', emoji: '💥', size: 28, x: 12, y: 18 },
      { id: '2', emoji: '💥', size: 28, x: 20, y: 26 },
    ]);
    expect(result.nextId).toBe(2);
    expect(result.playback).toBeNull();
    expect(result.lastPlayedAtMs).toBe(120);
  });

  test('returns existing state when there are no queued points', () => {
    const activeStamps: EmojiStamp[] = [
      {
        id: '4',
        emoji: '😂',
        size: 36,
        x: 80,
        y: 24,
      },
    ];

    const result = flushQueuedPointsToFrame({
      activeStamps,
      queuedPoints: [],
      emoji: '😂',
      size: 36,
      nextId: 4,
      nowMs: 500,
      lastPlayedAtMs: 240,
      minPlayIntervalMs: 120,
    });

    expect(result.activeStamps).toBe(activeStamps);
    expect(result.newStamps).toEqual([]);
    expect(result.nextId).toBe(4);
    expect(result.playback).toBeNull();
    expect(result.lastPlayedAtMs).toBe(240);
  });

  test('creates armed bomb stamps when the bomb emoji is selected', () => {
    const result = flushQueuedPointsToFrame({
      activeStamps: [],
      queuedPoints: [{ x: 90, y: 120 }],
      emoji: BOMB_EMOJI,
      size: 44,
      nextId: 0,
      nowMs: 750,
      lastPlayedAtMs: 0,
      minPlayIntervalMs: 120,
    });

    expect(result.activeStamps[0]).toEqual(
      expect.objectContaining({
        id: '1',
        emoji: BOMB_EMOJI,
        kind: 'bomb',
        placedAtMs: 750,
        detonateAtMs: 750 + BOMB_FUSE_MS,
      })
    );
    expect(result.newStamps).toHaveLength(1);
    expect(result.activeStamps[0].blastRadius).toBeGreaterThanOrEqual(BOMB_BLAST_RADIUS);
  });
});
