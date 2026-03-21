import type { CanvasPoint } from '@/features/emoji-draw/model/emoji-canvas-math';

export type EmojiStampKind = 'bomb' | 'swirl' | 'truck';

export type EmojiStamp = CanvasPoint & {
  id: string;
  emoji: string;
  size: number;
  kind?: EmojiStampKind;
  placedAtMs?: number;
  detonateAtMs?: number;
  blastRadius?: number;
};

export type BlastCloud = {
  xOffset: number;
  yOffset: number;
  radius: number;
  opacity: number;
  tone: 'core' | 'mist' | 'smoke';
};

export type BlastEffect = {
  id: string;
  x: number;
  y: number;
  clouds: BlastCloud[];
};

export type AnimatedBlastEffect = BlastEffect & {
  startedAtMs: number;
  durationMs: number;
};

export type ShockwaveEffect = {
  id: string;
  x: number;
  y: number;
  startedAtMs: number;
  durationMs: number;
  maxRadius: number;
};

export type SwirlEffect = {
  id: string;
  x: number;
  y: number;
  startedAtMs: number;
  durationMs: number;
  maxRadius: number;
  spinTurns: number;
};

export type TruckMoveEffect = {
  id: string;
  x: number;
  y: number;
  radius: number;
  deltaX: number;
  deltaY: number;
};

export type CanvasBounds = {
  width: number;
  height: number;
};

export const BOMB_EMOJI = '🧨';
export const SWIRL_EMOJI = '🌀';
export const TRUCK_EMOJI = '🚚';
export const BOMB_FUSE_MS = 2000;
export const BOMB_BLAST_RADIUS = 160;

export const STARTER_RECENT_EMOJIS = [
  '😀',
  '❤️',
  '💩',
  '😂',
  '🔥',
  '👁️',
  '👶',
  '👽',
  '🕴️',
  '🥁',
  '🎺',
  '🎸',
  '👏',
  '🤩',
  '🎉',
  '🚨',
  '📱',
  '⚔️',
  '😸',
  '🐶',
  '🎅',
  '🤢',
  '💋',
  '🤖',
  '🫧',
  SWIRL_EMOJI,
  TRUCK_EMOJI,
  '🙋',
  '💵',
  BOMB_EMOJI,
] as const;

export const BRUSH_SIZE_LIMITS = {
  min: 18,
  max: 92,
  initial: 80,
} as const;

export const STAMP_SPACING_RATIO = 0.55;
