import type { CanvasPoint } from '@/features/emoji-draw/model/emoji-canvas-math';
import {
  type AnimatedBlastEffect,
  type BlastCloud,
  type BlastEffect,
  BOMB_BLAST_RADIUS,
  BOMB_EMOJI,
  BOMB_FUSE_MS,
  type CanvasBounds,
  type EmojiStamp,
  type ShockwaveEffect,
  SWIRL_EMOJI,
  TRUCK_EMOJI,
} from '@/features/emoji-draw/model/types';

const BOMB_BLINK_INTERVAL_MS = 240;
const BOMB_SHINE_PULSE_MS = BOMB_BLINK_INTERVAL_MS * 2;
const BLAST_ANIMATION_DURATION_MS = 480;
const SHOCKWAVE_DURATION_MS = 900;

const BLAST_CLOUD_LAYOUT = [
  { xFactor: 0, yFactor: 0, radiusFactor: 0.52, opacity: 1, tone: 'core' },
  { xFactor: 0, yFactor: 0, radiusFactor: 0.72, opacity: 0.82, tone: 'mist' },
  { xFactor: -0.42, yFactor: -0.24, radiusFactor: 0.38, opacity: 0.56, tone: 'mist' },
  { xFactor: 0.44, yFactor: -0.16, radiusFactor: 0.36, opacity: 0.52, tone: 'mist' },
  { xFactor: -0.38, yFactor: 0.36, radiusFactor: 0.34, opacity: 0.48, tone: 'mist' },
  { xFactor: 0.4, yFactor: 0.34, radiusFactor: 0.32, opacity: 0.44, tone: 'mist' },
  { xFactor: -0.64, yFactor: -0.42, radiusFactor: 0.3, opacity: 0.32, tone: 'smoke' },
  { xFactor: 0.66, yFactor: -0.36, radiusFactor: 0.28, opacity: 0.3, tone: 'smoke' },
  { xFactor: -0.62, yFactor: 0.52, radiusFactor: 0.32, opacity: 0.28, tone: 'smoke' },
  { xFactor: 0.64, yFactor: 0.5, radiusFactor: 0.3, opacity: 0.26, tone: 'smoke' },
  { xFactor: -0.08, yFactor: -0.7, radiusFactor: 0.26, opacity: 0.24, tone: 'smoke' },
  { xFactor: 0.1, yFactor: 0.72, radiusFactor: 0.28, opacity: 0.22, tone: 'smoke' },
] as const;

export function isBombEmoji(emoji: string) {
  return emoji === BOMB_EMOJI;
}

function isSwirlEmoji(emoji: string) {
  return emoji === SWIRL_EMOJI;
}

function isTruckEmoji(emoji: string) {
  return emoji === TRUCK_EMOJI;
}

export function isBombStamp(stamp: EmojiStamp) {
  return stamp.kind === 'bomb';
}

type CreateEmojiStampParams = {
  id: string;
  emoji: string;
  size: number;
  point: CanvasPoint;
  nowMs: number;
};

export function createEmojiStamp({
  id,
  emoji,
  size,
  point,
  nowMs,
}: CreateEmojiStampParams): EmojiStamp {
  if (!isBombEmoji(emoji) && !isSwirlEmoji(emoji) && !isTruckEmoji(emoji)) {
    return {
      id,
      emoji,
      size,
      x: point.x,
      y: point.y,
    };
  }

  const sizeScale = Math.max(1, size / 40);

  if (isSwirlEmoji(emoji)) {
    return {
      id,
      emoji,
      size,
      x: point.x,
      y: point.y,
      kind: 'swirl',
      placedAtMs: nowMs,
      blastRadius: Math.round(BOMB_BLAST_RADIUS * sizeScale),
    };
  }

  if (isTruckEmoji(emoji)) {
    return {
      id,
      emoji,
      size,
      x: point.x,
      y: point.y,
      kind: 'truck',
      placedAtMs: nowMs,
      blastRadius: Math.round(BOMB_BLAST_RADIUS * sizeScale),
    };
  }

  return {
    id,
    emoji,
    size,
    x: point.x,
    y: point.y,
    kind: 'bomb',
    placedAtMs: nowMs,
    detonateAtMs: nowMs + BOMB_FUSE_MS,
    blastRadius: Math.round(BOMB_BLAST_RADIUS * sizeScale),
  };
}

export function getBombShineStrength(stamp: EmojiStamp, nowMs: number) {
  if (!isBombStamp(stamp) || stamp.placedAtMs === undefined) {
    return 0;
  }

  const elapsedMs = Math.max(0, nowMs - stamp.placedAtMs);
  const phase = (elapsedMs % BOMB_SHINE_PULSE_MS) / BOMB_SHINE_PULSE_MS;
  const sineWave = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  return 0.2 + sineWave * 0.8;
}

function createBlastClouds(radius: number): BlastCloud[] {
  return BLAST_CLOUD_LAYOUT.map((cloud) => ({
    xOffset: radius * cloud.xFactor,
    yOffset: radius * cloud.yFactor,
    radius: radius * cloud.radiusFactor,
    opacity: cloud.opacity,
    tone: cloud.tone,
  }));
}

export function createBlastEffect(stamp: EmojiStamp): BlastEffect {
  const radius = stamp.blastRadius ?? BOMB_BLAST_RADIUS;

  return {
    id: `blast:${stamp.id}`,
    x: stamp.x,
    y: stamp.y,
    clouds: createBlastClouds(radius),
  };
}

export function createPersistentEraseEffect(effect: BlastEffect): BlastEffect {
  return {
    id: effect.id,
    x: effect.x,
    y: effect.y,
    // Persist the full cloud silhouette; performance remains good because
    // these are rasterized into image patches before commit.
    clouds: effect.clouds.map((cloud) => ({
      ...cloud,
      opacity: Math.min(1, cloud.opacity),
    })),
  };
}

export function getBlastEffectBounds(effect: BlastEffect, blurPadding = 28) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const cloud of effect.clouds) {
    const cx = effect.x + cloud.xOffset;
    const cy = effect.y + cloud.yOffset;
    minX = Math.min(minX, cx - cloud.radius - blurPadding);
    minY = Math.min(minY, cy - cloud.radius - blurPadding);
    maxX = Math.max(maxX, cx + cloud.radius + blurPadding);
    maxY = Math.max(maxY, cy + cloud.radius + blurPadding);
  }

  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.max(1, Math.ceil(maxX - minX)),
    height: Math.max(1, Math.ceil(maxY - minY)),
  };
}

export function createAnimatedBlastEffect(stamp: EmojiStamp, nowMs: number): AnimatedBlastEffect {
  return {
    ...createBlastEffect(stamp),
    startedAtMs: nowMs,
    durationMs: BLAST_ANIMATION_DURATION_MS,
  };
}

export function resolveAnimatedBlastEffects(
  effects: AnimatedBlastEffect[],
  nowMs: number
) {
  const activeEffects: AnimatedBlastEffect[] = [];
  const completedEffects: AnimatedBlastEffect[] = [];

  for (const effect of effects) {
    if (nowMs - effect.startedAtMs < effect.durationMs) {
      activeEffects.push(effect);
      continue;
    }

    completedEffects.push(effect);
  }

  return {
    activeEffects,
    completedEffects,
  };
}

export function getShockwaveMaxRadius(
  point: CanvasPoint,
  bounds: CanvasBounds,
  minimumRadius: number
) {
  const corners = [
    { x: 0, y: 0 },
    { x: bounds.width, y: 0 },
    { x: 0, y: bounds.height },
    { x: bounds.width, y: bounds.height },
  ];
  const farthestCornerDistance = corners.reduce((maxDistance, corner) => {
    const distance = Math.hypot(corner.x - point.x, corner.y - point.y);
    return Math.max(maxDistance, distance);
  }, 0);

  return Math.max(minimumRadius, farthestCornerDistance);
}

export function createShockwaveEffect(
  stamp: EmojiStamp,
  nowMs: number,
  bounds: CanvasBounds
): ShockwaveEffect {
  const radius = stamp.blastRadius ?? BOMB_BLAST_RADIUS;
  return {
    id: `wave:${stamp.id}`,
    x: stamp.x,
    y: stamp.y,
    startedAtMs: nowMs,
    durationMs: SHOCKWAVE_DURATION_MS,
    maxRadius: getShockwaveMaxRadius(stamp, bounds, radius),
  };
}

export function resolveActiveShockwaves(shockwaves: ShockwaveEffect[], nowMs: number) {
  return shockwaves.filter((wave) => nowMs - wave.startedAtMs < wave.durationMs);
}

export function coalesceShockwaves(
  existing: ShockwaveEffect[],
  incoming: ShockwaveEffect[],
  windowMs = 50
) {
  const merged = existing.slice();

  for (const wave of incoming) {
    const candidate = merged.find(
      (current) => Math.abs(current.startedAtMs - wave.startedAtMs) <= windowMs
    );

    if (!candidate) {
      merged.push(wave);
      continue;
    }

    if (wave.startedAtMs < candidate.startedAtMs) {
      candidate.x = wave.x;
      candidate.y = wave.y;
      candidate.startedAtMs = wave.startedAtMs;
    }
    candidate.maxRadius = Math.max(candidate.maxRadius, wave.maxRadius);
    candidate.durationMs = Math.max(candidate.durationMs, wave.durationMs);
  }

  return merged;
}

export function resolveBombDetonations(armedBombs: EmojiStamp[], nowMs: number) {
  const remainingBombs: EmojiStamp[] = [];
  const effects: BlastEffect[] = [];
  const detonatedBombs: EmojiStamp[] = [];

  for (const stamp of armedBombs) {
    if (isBombStamp(stamp) && stamp.detonateAtMs !== undefined && stamp.detonateAtMs <= nowMs) {
      effects.push(createBlastEffect(stamp));
      detonatedBombs.push(stamp);
      continue;
    }

    remainingBombs.push(stamp);
  }

  return {
    armedBombs: effects.length === 0 ? armedBombs : remainingBombs,
    effects,
    detonatedBombs,
  };
}
