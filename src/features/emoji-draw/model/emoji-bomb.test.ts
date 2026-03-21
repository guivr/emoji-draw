import {
  coalesceShockwaves,
  getBlastEffectBounds,
  createPersistentEraseEffect,
  createAnimatedBlastEffect,
  createBlastEffect,
  createEmojiStamp,
  createShockwaveEffect,
  getShockwaveMaxRadius,
  getBombShineStrength,
  resolveAnimatedBlastEffects,
  resolveActiveShockwaves,
  resolveBombDetonations,
} from '@/features/emoji-draw/model/emoji-bomb';
import {
  BOMB_BLAST_RADIUS,
  BOMB_EMOJI,
  BOMB_FUSE_MS,
  type BlastEffect,
  type ShockwaveEffect,
} from '@/features/emoji-draw/model/types';

describe('emoji bomb helpers', () => {
  test('creates armed bomb stamps with fuse metadata', () => {
    const stamp = createEmojiStamp({
      id: '7',
      emoji: BOMB_EMOJI,
      size: 52,
      point: { x: 140, y: 180 },
      nowMs: 500,
    });

    expect(stamp).toEqual(
      expect.objectContaining({
        id: '7',
        emoji: BOMB_EMOJI,
        kind: 'bomb',
        placedAtMs: 500,
        detonateAtMs: 500 + BOMB_FUSE_MS,
      })
    );
    expect(stamp.blastRadius).toBeGreaterThan(BOMB_BLAST_RADIUS);
  });

  test('leaves regular emoji stamps unchanged', () => {
    const stamp = createEmojiStamp({
      id: '2',
      emoji: '🔥',
      size: 48,
      point: { x: 12, y: 22 },
      nowMs: 100,
    });

    expect(stamp).toEqual({
      id: '2',
      emoji: '🔥',
      size: 48,
      x: 12,
      y: 22,
    });
  });

  test('pulses bomb shine strength while the fuse is active', () => {
    const stamp = createEmojiStamp({
      id: '3',
      emoji: BOMB_EMOJI,
      size: 44,
      point: { x: 20, y: 30 },
      nowMs: 1000,
    });

    const atStart = getBombShineStrength(stamp, 1000);
    const atPeak = getBombShineStrength(stamp, 1240);
    const atFull = getBombShineStrength(stamp, 1480);

    expect(atStart).toBeCloseTo(0.2);
    expect(atPeak).toBeCloseTo(1);
    expect(atFull).toBeCloseTo(0.2);
    expect(atPeak).toBeGreaterThan(atStart);
  });

  test('detonates expired bombs into blast effects and keeps future bombs armed', () => {
    const explodingBomb = createEmojiStamp({
      id: '1',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 70, y: 90 },
      nowMs: 0,
    });
    const futureBomb = createEmojiStamp({
      id: '2',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 140, y: 160 },
      nowMs: 2000,
    });

    const result = resolveBombDetonations(
      [explodingBomb, futureBomb],
      explodingBomb.detonateAtMs ?? BOMB_FUSE_MS
    );

    expect(result.armedBombs).toEqual([futureBomb]);
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]).toEqual(
      expect.objectContaining({
        id: 'blast:1',
        x: 70,
        y: 90,
      })
    );
    expect(result.effects[0].clouds).toHaveLength(12);
    expect(result.detonatedBombs).toEqual([explodingBomb]);
  });

  test('builds a white-hot center with smoky edge clouds', () => {
    const bomb = createEmojiStamp({
      id: '4',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 55, y: 75 },
      nowMs: 200,
    });

    const effect = createBlastEffect(bomb);

    expect(effect.id).toBe('blast:4');
    expect(effect.clouds[0]).toEqual(
      expect.objectContaining({
        radius: BOMB_BLAST_RADIUS * 0.52,
        tone: 'core',
      })
    );
    expect(effect.clouds.at(-1)).toEqual(
      expect.objectContaining({
        tone: 'smoke',
      })
    );
  });

  test('builds lightweight persistent erase effects for long-term canvas performance', () => {
    const bomb = createEmojiStamp({
      id: 'erase-1',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 80, y: 90 },
      nowMs: 0,
    });
    const blast = createBlastEffect(bomb);
    const persistent = createPersistentEraseEffect(blast);

    expect(persistent.id).toBe(blast.id);
    expect(persistent.x).toBe(blast.x);
    expect(persistent.y).toBe(blast.y);
    expect(persistent.clouds).toHaveLength(12);
    expect(persistent.clouds[0]).toEqual(
      expect.objectContaining({
        xOffset: 0,
        yOffset: 0,
        tone: 'core',
      })
    );
    expect(persistent.clouds[0].radius).toBeCloseTo(BOMB_BLAST_RADIUS * 0.52);
    expect(persistent.clouds.at(-1)).toEqual(
      expect.objectContaining({
        tone: 'smoke',
      })
    );
  });

  test('computes tight blast bounds with blur padding for patch rasterization', () => {
    const effect: BlastEffect = {
      id: 'blast:bounds',
      x: 100,
      y: 120,
      clouds: [
        { xOffset: 0, yOffset: 0, radius: 20, opacity: 1, tone: 'core' },
        { xOffset: 40, yOffset: -10, radius: 12, opacity: 0.6, tone: 'mist' },
      ],
    };

    const bounds = getBlastEffectBounds(effect);

    expect(bounds.x).toBe(52);
    expect(bounds.y).toBe(70);
    expect(bounds.width).toBe(128);
    expect(bounds.height).toBe(98);
  });

  test('creates an animated blast that starts at detonation time', () => {
    const bomb = createEmojiStamp({
      id: 'blast-anim-1',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 55, y: 75 },
      nowMs: 200,
    });

    const effect = createAnimatedBlastEffect(bomb, 1800);

    expect(effect).toEqual(
      expect.objectContaining({
        id: 'blast:blast-anim-1',
        x: 55,
        y: 75,
        startedAtMs: 1800,
      })
    );
    expect(effect.durationMs).toBeGreaterThan(0);
    expect(effect.clouds).toHaveLength(12);
  });

  test('sizes shockwave to the farthest canvas edge', () => {
    expect(
      getShockwaveMaxRadius(
        { x: 120, y: 220 },
        { width: 320, height: 440 },
        BOMB_BLAST_RADIUS
      )
    ).toBeCloseTo(Math.hypot(200, 220));
  });

  test('creates a playful shockwave that can cross the whole canvas', () => {
    const bomb = createEmojiStamp({
      id: 'shock-1',
      emoji: BOMB_EMOJI,
      size: 48,
      point: { x: 120, y: 220 },
      nowMs: 300,
    });

    const wave = createShockwaveEffect(bomb, 2400, {
      width: 320,
      height: 440,
    });

    expect(wave).toEqual(
      expect.objectContaining({
        id: 'wave:shock-1',
        x: 120,
        y: 220,
        startedAtMs: 2400,
      })
    );
    expect(wave.maxRadius).toBeCloseTo(Math.hypot(200, 220));
    expect(wave.durationMs).toBeGreaterThan(0);
  });

  test('keeps active shockwaves and drops expired ones', () => {
    const bomb = createEmojiStamp({
      id: 'shock-2',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 90, y: 110 },
      nowMs: 1000,
    });
    const wave = createShockwaveEffect(bomb, 1500, {
      width: 300,
      height: 300,
    });

    const stillActive = resolveActiveShockwaves([wave], wave.startedAtMs + wave.durationMs - 1);
    const expired = resolveActiveShockwaves([wave], wave.startedAtMs + wave.durationMs + 1);

    expect(stillActive).toHaveLength(1);
    expect(expired).toHaveLength(0);
  });

  test('coalesces shockwaves that start within a 50ms window', () => {
    const first: ShockwaveEffect = {
      id: 'wave:a',
      x: 100,
      y: 120,
      startedAtMs: 1000,
      durationMs: 900,
      maxRadius: 260,
    };
    const second: ShockwaveEffect = {
      id: 'wave:b',
      x: 220,
      y: 260,
      startedAtMs: 1030,
      durationMs: 900,
      maxRadius: 320,
    };

    const merged = coalesceShockwaves([], [first, second], 50);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(
      expect.objectContaining({
        startedAtMs: 1000,
        x: 100,
        y: 120,
        maxRadius: 320,
      })
    );
  });

  test('keeps separate shockwaves when start times are outside window', () => {
    const first: ShockwaveEffect = {
      id: 'wave:a',
      x: 80,
      y: 90,
      startedAtMs: 1000,
      durationMs: 900,
      maxRadius: 250,
    };
    const second: ShockwaveEffect = {
      id: 'wave:b',
      x: 260,
      y: 210,
      startedAtMs: 1065,
      durationMs: 900,
      maxRadius: 310,
    };

    const merged = coalesceShockwaves([], [first, second], 50);

    expect(merged).toHaveLength(2);
  });

  test('keeps animated blast overlays until they finish, then marks them complete', () => {
    const bomb = createEmojiStamp({
      id: 'blast-anim-2',
      emoji: BOMB_EMOJI,
      size: 40,
      point: { x: 90, y: 110 },
      nowMs: 1000,
    });
    const effect = createAnimatedBlastEffect(bomb, 1500);

    const activeResult = resolveAnimatedBlastEffects(
      [effect],
      effect.startedAtMs + effect.durationMs - 1
    );
    const completedResult = resolveAnimatedBlastEffects(
      [effect],
      effect.startedAtMs + effect.durationMs + 1
    );

    expect(activeResult.activeEffects).toHaveLength(1);
    expect(activeResult.completedEffects).toHaveLength(0);
    expect(completedResult.activeEffects).toHaveLength(0);
    expect(completedResult.completedEffects).toEqual([effect]);
  });
});
