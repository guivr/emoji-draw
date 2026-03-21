import type { CanvasPoint } from '@/features/emoji-draw/model/emoji-canvas-math';
import {
  TRUCK_EMOJI,
  type EmojiStamp,
  type TruckMoveEffect,
} from '@/features/emoji-draw/model/types';

export function getTruckMoveRadius(size: number) {
  return Math.max(1, Math.round(size / 2));
}

export function isTruckEmoji(emoji: string) {
  return emoji === TRUCK_EMOJI;
}

export function isTruckStamp(stamp: EmojiStamp) {
  return stamp.kind === 'truck';
}

type CreateTruckMoveEffectParams = {
  id: string;
  size: number;
  anchor: CanvasPoint;
  current: CanvasPoint;
};

export function createTruckMoveEffect({
  id,
  size,
  anchor,
  current,
}: CreateTruckMoveEffectParams): TruckMoveEffect {
  return {
    id,
    x: anchor.x,
    y: anchor.y,
    radius: getTruckMoveRadius(size),
    deltaX: current.x - anchor.x,
    deltaY: current.y - anchor.y,
  };
}

export function hasTruckMoveDelta(effect: TruckMoveEffect, minDelta = 0.75) {
  return Math.hypot(effect.deltaX, effect.deltaY) >= minDelta;
}
