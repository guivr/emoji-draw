import { createEmojiStamp } from '@/features/emoji-draw/model/emoji-bomb';
import type { CanvasPoint } from '@/features/emoji-draw/model/emoji-canvas-math';
import type { EmojiStamp } from '@/features/emoji-draw/model/types';

type FlushQueuedPointsParams = {
  activeStamps: EmojiStamp[];
  queuedPoints: CanvasPoint[];
  emoji: string;
  size: number;
  nextId: number;
  nowMs: number;
  lastPlayedAtMs: number;
  minPlayIntervalMs: number;
};

type PlaybackPlan = {
  emoji: string;
  stampCount: number;
  playedAtMs: number;
};

type FlushQueuedPointsResult = {
  activeStamps: EmojiStamp[];
  newStamps: EmojiStamp[];
  nextId: number;
  playback: PlaybackPlan | null;
  lastPlayedAtMs: number;
};

function createStampEntries(
  queuedPoints: CanvasPoint[],
  emoji: string,
  size: number,
  nextId: number,
  nowMs: number
) {
  let currentId = nextId;

  const stamps = queuedPoints.map((point) => {
    currentId += 1;

    return createEmojiStamp({
      id: String(currentId),
      emoji,
      size,
      point,
      nowMs,
    });
  });

  return {
    stamps,
    nextId: currentId,
  };
}

export function flushQueuedPointsToFrame({
  activeStamps,
  queuedPoints,
  emoji,
  size,
  nextId,
  nowMs,
  lastPlayedAtMs,
  minPlayIntervalMs,
}: FlushQueuedPointsParams): FlushQueuedPointsResult {
  if (queuedPoints.length === 0) {
    return {
      activeStamps,
      newStamps: [],
      nextId,
      playback: null,
      lastPlayedAtMs,
    };
  }

  const { stamps, nextId: resolvedNextId } = createStampEntries(
    queuedPoints,
    emoji,
    size,
    nextId,
    nowMs
  );
  const playback =
    nowMs - lastPlayedAtMs >= minPlayIntervalMs
      ? {
          emoji,
          stampCount: stamps.length,
          playedAtMs: nowMs,
        }
      : null;

  return {
    activeStamps: activeStamps.concat(stamps),
    newStamps: stamps,
    nextId: resolvedNextId,
    playback,
    lastPlayedAtMs: playback?.playedAtMs ?? lastPlayedAtMs,
  };
}
