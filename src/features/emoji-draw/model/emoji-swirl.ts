import type { CanvasPoint } from '@/features/emoji-draw/model/emoji-canvas-math';
import {
  BOMB_BLAST_RADIUS,
  SWIRL_EMOJI,
  type CanvasBounds,
  type EmojiStamp,
  type SwirlEffect,
} from '@/features/emoji-draw/model/types';

const SWIRL_DURATION_MS = 820;
const SWIRL_SPIN_TURNS = 1.2;
const SWIRL_SIZE_BASELINE = 40;
const SWIRL_STRENGTH_MIN_SCALE = 0.75;
const SWIRL_STRENGTH_MAX_SCALE = 1.6;

export function isSwirlEmoji(emoji: string) {
  return emoji === SWIRL_EMOJI;
}

export function isSwirlStamp(stamp: EmojiStamp) {
  return stamp.kind === 'swirl';
}

function getFarthestCornerRadius(point: CanvasPoint, bounds: CanvasBounds, minimumRadius: number) {
  const corners = [
    { x: 0, y: 0 },
    { x: bounds.width, y: 0 },
    { x: 0, y: bounds.height },
    { x: bounds.width, y: bounds.height },
  ];
  const maxDistance = corners.reduce((distance, corner) => {
    return Math.max(distance, Math.hypot(corner.x - point.x, corner.y - point.y));
  }, 0);
  return Math.max(minimumRadius, maxDistance);
}

function getSwirlStrengthScale(size: number) {
  const normalized = size / SWIRL_SIZE_BASELINE;
  return Math.min(
    SWIRL_STRENGTH_MAX_SCALE,
    Math.max(SWIRL_STRENGTH_MIN_SCALE, normalized)
  );
}

export function createSwirlEffect(
  stamp: EmojiStamp,
  nowMs: number,
  bounds: CanvasBounds
): SwirlEffect {
  const minimumRadius = stamp.blastRadius ?? BOMB_BLAST_RADIUS;
  return {
    id: `swirl:${stamp.id}`,
    x: stamp.x,
    y: stamp.y,
    startedAtMs: nowMs,
    durationMs: SWIRL_DURATION_MS,
    maxRadius: getFarthestCornerRadius(stamp, bounds, minimumRadius),
    spinTurns: SWIRL_SPIN_TURNS * getSwirlStrengthScale(stamp.size),
  };
}

export function resolveSwirlEffects(effects: SwirlEffect[], nowMs: number) {
  const activeEffects: SwirlEffect[] = [];
  const completedEffects: SwirlEffect[] = [];

  for (const effect of effects) {
    if (nowMs - effect.startedAtMs < effect.durationMs) {
      activeEffects.push(effect);
    } else {
      completedEffects.push(effect);
    }
  }

  return {
    activeEffects,
    completedEffects,
  };
}

export function getSwirlVisualProgress(effect: SwirlEffect, nowMs: number) {
  const elapsedMs = Math.max(0, nowMs - effect.startedAtMs);
  const linear = Math.min(1, elapsedMs / effect.durationMs);
  // Monotonic ease-out: quickly establishes the twist, then settles.
  return 1 - Math.pow(1 - linear, 2.2);
}

export function coalesceSwirls(
  existing: SwirlEffect[],
  incoming: SwirlEffect[],
  windowMs = 80
) {
  const merged = existing.slice();

  for (const swirl of incoming) {
    const candidate = merged.find(
      (current) => Math.abs(current.startedAtMs - swirl.startedAtMs) <= windowMs
    );
    if (!candidate) {
      merged.push(swirl);
      continue;
    }

    if (swirl.startedAtMs < candidate.startedAtMs) {
      candidate.x = swirl.x;
      candidate.y = swirl.y;
      candidate.startedAtMs = swirl.startedAtMs;
    }
    candidate.maxRadius = Math.max(candidate.maxRadius, swirl.maxRadius);
    candidate.durationMs = Math.max(candidate.durationMs, swirl.durationMs);
    candidate.spinTurns = Math.max(candidate.spinTurns, swirl.spinTurns);
  }

  return merged;
}

export function appendConcurrentSwirls(
  existing: SwirlEffect[],
  incoming: SwirlEffect[],
  maxConcurrent = 6
) {
  if (incoming.length === 0) {
    return existing;
  }

  return existing.concat(incoming).slice(-Math.max(1, maxConcurrent));
}
