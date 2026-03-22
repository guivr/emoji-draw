import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SkImage, SkPicture } from '@shopify/react-native-skia';
import {
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  TileMode,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { PixelRatio } from 'react-native';

import {
  coalesceShockwaves,
  createAnimatedBlastEffect,
  createPersistentEraseEffect,
  createShockwaveEffect,
  getBlastEffectBounds,
  isBombStamp,
  resolveActiveShockwaves,
  resolveAnimatedBlastEffects,
  resolveBombDetonations,
} from '@/features/emoji-draw/model/emoji-bomb';
import {
  clampBrushSize,
  createInterpolatedStamps,
  type CanvasPoint,
} from '@/features/emoji-draw/model/emoji-canvas-math';
import { getEmojiFont } from '@/features/emoji-draw/model/emoji-font';
import { flushQueuedPointsToFrame } from '@/features/emoji-draw/model/emoji-frame-coordinator';
import { getMinPlayIntervalForEmoji } from '@/features/emoji-draw/model/emoji-sound';
import {
  playBombExplodeSound,
  playBombSizzleSound,
  playEmojiPlacementSound,
  playSwirlDragSound,
  playTruckDragSound,
  playRedoSound,
  playUndoSound,
  primeEmojiPlacementAudio,
  stopSwirlDragSound,
  stopTruckDragSound,
} from '@/features/emoji-draw/model/emoji-sound-player';
import {
  appendConcurrentSwirls,
  createSwirlEffect,
  getSwirlVisualProgress,
  isSwirlEmoji,
  isSwirlStamp,
  resolveSwirlEffects,
} from '@/features/emoji-draw/model/emoji-swirl';
import {
  createTruckMoveEffect,
  hasTruckMoveDelta,
  isTruckEmoji,
} from '@/features/emoji-draw/model/emoji-truck';
import { getRasterBakeSpec } from '@/features/emoji-draw/model/snapshot-fit';
import {
  BRUSH_SIZE_LIMITS,
  STAMP_SPACING_RATIO,
  STARTER_RECENT_EMOJIS,
  type AnimatedBlastEffect,
  type BlastEffect,
  type CanvasBounds,
  type EmojiStamp,
  type ShockwaveEffect,
  type SwirlEffect,
  type TruckMoveEffect,
} from '@/features/emoji-draw/model/types';

function clampPointToBounds(point: CanvasPoint, bounds: CanvasBounds) {
  return {
    x: Math.min(Math.max(point.x, 0), bounds.width),
    y: Math.min(Math.max(point.y, 0), bounds.height),
  };
}

const sharedPaint = Skia.Paint();
const SWIRL_BAKE_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 center;
uniform float progress;
uniform float maxRadius;
uniform float spinTurns;

half4 main(float2 xy) {
  float2 offset = xy - center;
  float dist = length(offset);
  float radius = max(maxRadius, 1.0);
  float inside = clamp(1.0 - dist / radius, 0.0, 1.0);
  float envelope = smoothstep(0.0, 1.0, inside);
  float angle = spinTurns * 6.2831853 * progress * envelope * envelope;
  float s = sin(angle);
  float c = cos(angle);
  float2 rotated = float2(
    offset.x * c - offset.y * s,
    offset.x * s + offset.y * c
  );

  return image.eval(center + rotated);
}
`);
const TRUCK_MOVE_BAKE_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 center;
uniform float radius;
uniform float2 delta;

half4 main(float2 xy) {
  float safeRadius = max(radius, 1.0);
  float2 destinationCenter = center + delta;
  float destinationDist = length(xy - destinationCenter);
  if (destinationDist <= safeRadius) {
    return image.eval(xy - delta);
  }

  float sourceDist = length(xy - center);
  if (sourceDist <= safeRadius) {
    return half4(1.0, 1.0, 1.0, 1.0);
  }

  return image.eval(xy);
}
`);

type ExplosionPatch = {
  image: SkImage;
  x: number;
  y: number;
};

function recordPicture(
  previousPicture: SkPicture | null,
  stamps: EmojiStamp[],
  effects?: BlastEffect[],
  explosionPatches?: ExplosionPatch[]
): SkPicture {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();

  if (previousPicture) {
    canvas.drawPicture(previousPicture);
  }

  if (effects) {
    for (const effect of effects) {
      for (const cloud of effect.clouds) {
        const isCore = cloud.tone === 'core';
        const blurSigma = isCore ? 10 : cloud.tone === 'mist' ? 16 : 24;

        const cloudPaint = Skia.Paint();
        cloudPaint.setColor(Skia.Color('white'));
        cloudPaint.setAlphaf(cloud.opacity);
        cloudPaint.setMaskFilter(
          Skia.MaskFilter.MakeBlur(0, blurSigma, true)
        );

        canvas.drawCircle(
          effect.x + cloud.xOffset,
          effect.y + cloud.yOffset,
          cloud.radius,
          cloudPaint
        );
      }
    }
  }

  if (explosionPatches) {
    for (const patch of explosionPatches) {
      canvas.drawImage(patch.image, patch.x, patch.y);
    }
  }

  for (const stamp of stamps) {
    const font = getEmojiFont(stamp.size);
    canvas.drawText(
      stamp.emoji,
      stamp.x - stamp.size / 2,
      stamp.y + stamp.size * 0.3,
      sharedPaint,
      font
    );
  }

  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  return picture;
}

function rasterizeExplosionPicture(
  effects: BlastEffect[],
  bounds: CanvasBounds
): ExplosionPatch[] {
  if (effects.length === 0 || bounds.width <= 0 || bounds.height <= 0) {
    return [];
  }

  const canvasWidth = Math.max(1, Math.round(bounds.width));
  const canvasHeight = Math.max(1, Math.round(bounds.height));
  const patches: ExplosionPatch[] = [];

  for (const effect of effects) {
    const raw = getBlastEffectBounds(effect);
    const x = Math.max(0, raw.x);
    const y = Math.max(0, raw.y);
    const right = Math.min(canvasWidth, raw.x + raw.width);
    const bottom = Math.min(canvasHeight, raw.y + raw.height);
    const width = Math.max(0, right - x);
    const height = Math.max(0, bottom - y);
    if (width <= 0 || height <= 0) {
      continue;
    }

    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (!surface) {
      continue;
    }

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color('transparent'));
    for (const cloud of effect.clouds) {
      const blurSigma = cloud.tone === 'core' ? 10 : cloud.tone === 'mist' ? 16 : 24;
      const cloudPaint = Skia.Paint();
      cloudPaint.setColor(Skia.Color('white'));
      const alphaBoost = cloud.tone === 'core' ? 1 : cloud.tone === 'mist' ? 0.95 : 0.9;
      cloudPaint.setAlphaf(Math.min(1, cloud.opacity * alphaBoost));
      cloudPaint.setMaskFilter(
        Skia.MaskFilter.MakeBlur(0, blurSigma, true)
      );

      const radiusBoost = cloud.tone === 'core' ? 1.05 : cloud.tone === 'mist' ? 1.14 : 1.22;
      canvas.drawCircle(
        effect.x + cloud.xOffset - x,
        effect.y + cloud.yOffset - y,
        cloud.radius * radiusBoost,
        cloudPaint
      );
    }
    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    // Detach from GPU/offscreen surface lifetime so the patch remains drawable
    // after the temporary surface is disposed.
    const image = snapshot.makeNonTextureImage();
    if (image !== snapshot) {
      snapshot.dispose();
    }
    patches.push({ image, x, y });
    surface.dispose();
  }

  return patches;
}

function bakeSwirlEffectsIntoPicture(
  picture: SkPicture | null,
  effects: SwirlEffect[],
  bounds: CanvasBounds,
  pixelRatio: number
) {
  if (!picture || !SWIRL_BAKE_SHADER || effects.length === 0) {
    return picture;
  }

  const logicalWidth = Math.max(1, Math.round(bounds.width));
  const logicalHeight = Math.max(1, Math.round(bounds.height));
  const { rasterScale, pixelWidth, pixelHeight } = getRasterBakeSpec(
    logicalWidth,
    logicalHeight,
    pixelRatio,
    3
  );
  let currentPicture: SkPicture | null = picture;

  for (const effect of effects) {
    if (!currentPicture) break;
    const sourceSurface = Skia.Surface.MakeOffscreen(pixelWidth, pixelHeight);
    if (!sourceSurface) continue;

    const sourceCanvas = sourceSurface.getCanvas();
    sourceCanvas.clear(Skia.Color('white'));
    sourceCanvas.scale(rasterScale, rasterScale);
    sourceCanvas.drawPicture(currentPicture);
    sourceSurface.flush();
    const sourceImage = sourceSurface.makeImageSnapshot();

    const imageShader = sourceImage.makeShaderOptions(
      TileMode.Decal,
      TileMode.Decal,
      FilterMode.Nearest,
      MipmapMode.None
    );
    const swirlShader = SWIRL_BAKE_SHADER.makeShaderWithChildren(
      [
        effect.x * rasterScale,
        effect.y * rasterScale,
        getSwirlVisualProgress(effect, effect.startedAtMs + effect.durationMs),
        effect.maxRadius * rasterScale,
        effect.spinTurns,
      ],
      [imageShader]
    );

    const targetSurface = Skia.Surface.MakeOffscreen(pixelWidth, pixelHeight);
    if (!targetSurface) {
      sourceImage.dispose();
      sourceSurface.dispose();
      continue;
    }

    const targetCanvas = targetSurface.getCanvas();
    targetCanvas.clear(Skia.Color('white'));
    const targetPaint = Skia.Paint();
    targetPaint.setShader(swirlShader);
    targetCanvas.drawRect(Skia.XYWHRect(0, 0, pixelWidth, pixelHeight), targetPaint);
    targetSurface.flush();

    const targetSnapshot = targetSurface.makeImageSnapshot();
    const bakedImage = targetSnapshot.makeNonTextureImage();
    if (bakedImage !== targetSnapshot) {
      targetSnapshot.dispose();
    }

    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording();
    canvas.scale(1 / rasterScale, 1 / rasterScale);
    canvas.drawImage(bakedImage, 0, 0);
    currentPicture = recorder.finishRecordingAsPicture();
    recorder.dispose();

    bakedImage.dispose();
    sourceImage.dispose();
    sourceSurface.dispose();
    targetSurface.dispose();
  }

  return currentPicture;
}

function bakeTruckMoveIntoPicture(
  picture: SkPicture | null,
  effect: TruckMoveEffect,
  bounds: CanvasBounds,
  pixelRatio: number
) {
  if (!picture || !TRUCK_MOVE_BAKE_SHADER) {
    return picture;
  }

  const logicalWidth = Math.max(1, Math.round(bounds.width));
  const logicalHeight = Math.max(1, Math.round(bounds.height));
  const { rasterScale, pixelWidth, pixelHeight } = getRasterBakeSpec(
    logicalWidth,
    logicalHeight,
    pixelRatio,
    3
  );

  const sourceSurface = Skia.Surface.MakeOffscreen(pixelWidth, pixelHeight);
  if (!sourceSurface) {
    return picture;
  }

  const sourceCanvas = sourceSurface.getCanvas();
  sourceCanvas.clear(Skia.Color('white'));
  sourceCanvas.scale(rasterScale, rasterScale);
  sourceCanvas.drawPicture(picture);
  sourceSurface.flush();
  const sourceImage = sourceSurface.makeImageSnapshot();

  const imageShader = sourceImage.makeShaderOptions(
    TileMode.Decal,
    TileMode.Decal,
    FilterMode.Nearest,
    MipmapMode.None
  );
  const moveShader = TRUCK_MOVE_BAKE_SHADER.makeShaderWithChildren(
    [
      effect.x * rasterScale,
      effect.y * rasterScale,
      effect.radius * rasterScale,
      effect.deltaX * rasterScale,
      effect.deltaY * rasterScale,
    ],
    [imageShader]
  );

  const targetSurface = Skia.Surface.MakeOffscreen(pixelWidth, pixelHeight);
  if (!targetSurface) {
    sourceImage.dispose();
    sourceSurface.dispose();
    return picture;
  }

  const targetCanvas = targetSurface.getCanvas();
  targetCanvas.clear(Skia.Color('white'));
  const targetPaint = Skia.Paint();
  targetPaint.setShader(moveShader);
  targetCanvas.drawRect(Skia.XYWHRect(0, 0, pixelWidth, pixelHeight), targetPaint);
  targetSurface.flush();

  const targetSnapshot = targetSurface.makeImageSnapshot();
  const bakedImage = targetSnapshot.makeNonTextureImage();
  if (bakedImage !== targetSnapshot) {
    targetSnapshot.dispose();
  }

  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording();
  canvas.scale(1 / rasterScale, 1 / rasterScale);
  canvas.drawImage(bakedImage, 0, 0);
  const bakedPicture = recorder.finishRecordingAsPicture();
  recorder.dispose();

  bakedImage.dispose();
  sourceImage.dispose();
  sourceSurface.dispose();
  targetSurface.dispose();

  return bakedPicture;
}

export function useEmojiCanvas() {
  const devicePixelRatioRef = useRef(PixelRatio.get());
  const [selectedEmoji, setSelectedEmoji] = useState<string>(STARTER_RECENT_EMOJIS[0]);
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZE_LIMITS.initial);
  const [activeStamps, setActiveStamps] = useState<EmojiStamp[]>([]);
  const [committedEmojiPicture, setCommittedEmojiPicture] = useState<SkPicture | null>(null);
  const [armedBombs, setArmedBombs] = useState<EmojiStamp[]>([]);
  const [activeBlastEffects, setActiveBlastEffects] = useState<AnimatedBlastEffect[]>([]);
  const [activeShockwaves, setActiveShockwaves] = useState<ShockwaveEffect[]>([]);
  const [activeSwirls, setActiveSwirls] = useState<SwirlEffect[]>([]);
  const [activeTruckMove, setActiveTruckMove] = useState<TruckMoveEffect | null>(null);
  const [bombAnimationTick, setBombAnimationTick] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lastPointRef = useRef<CanvasPoint | null>(null);
  const canvasBoundsRef = useRef<CanvasBounds>({ width: 0, height: 0 });
  const idCounterRef = useRef(0);
  const committedEmojiPictureRef = useRef<SkPicture | null>(null);
  const activeStampsRef = useRef<EmojiStamp[]>([]);
  const armedBombsRef = useRef<EmojiStamp[]>([]);
  const activeBlastEffectsRef = useRef<AnimatedBlastEffect[]>([]);
  const activeShockwavesRef = useRef<ShockwaveEffect[]>([]);
  const activeSwirlsRef = useRef<SwirlEffect[]>([]);
  const queuedPointsRef = useRef<CanvasPoint[]>([]);
  const frameRequestRef = useRef<number | null>(null);
  const strokeStartPointRef = useRef<CanvasPoint | null>(null);
  const activeTruckMoveRef = useRef<TruckMoveEffect | null>(null);
  const lastPlayedAtRef = useRef(0);
  const selectedEmojiRef = useRef(selectedEmoji);
  const brushSizeRef = useRef(brushSize);
  const historyPastRef = useRef<Array<SkPicture | null>>([]);
  const historyFutureRef = useRef<Array<SkPicture | null>>([]);

  selectedEmojiRef.current = selectedEmoji;
  brushSizeRef.current = brushSize;

  useEffect(() => {
    primeEmojiPlacementAudio();

    return () => {
      if (frameRequestRef.current !== null) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, []);

  const resetInFlightDrawingState = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }

    activeStampsRef.current = [];
    queuedPointsRef.current = [];
    setActiveStamps([]);
    armedBombsRef.current = [];
    setArmedBombs([]);
    activeBlastEffectsRef.current = [];
    setActiveBlastEffects([]);
    activeShockwavesRef.current = [];
    setActiveShockwaves([]);
    activeSwirlsRef.current = [];
    setActiveSwirls([]);
    activeTruckMoveRef.current = null;
    setActiveTruckMove(null);
    stopSwirlDragSound();
    stopTruckDragSound(false);
    setBombAnimationTick(0);
    lastPlayedAtRef.current = 0;
    lastPointRef.current = null;
    strokeStartPointRef.current = null;
  }, []);

  const commitPicture = useCallback((nextPicture: SkPicture | null, recordHistory = true) => {
    if (nextPicture === committedEmojiPictureRef.current) {
      return;
    }

    if (recordHistory) {
      historyPastRef.current = historyPastRef.current.concat(committedEmojiPictureRef.current);
      historyFutureRef.current = [];
      setCanUndo(historyPastRef.current.length > 0);
      setCanRedo(false);
    }

    committedEmojiPictureRef.current = nextPicture;
    setCommittedEmojiPicture(nextPicture);
  }, []);

  useEffect(() => {
    if (
      armedBombs.length === 0 &&
      activeBlastEffects.length === 0 &&
      activeShockwaves.length === 0 &&
      activeSwirls.length === 0
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      const nowMs = performance.now();
      setBombAnimationTick(nowMs);

      const result = resolveBombDetonations(armedBombsRef.current, nowMs);
      if (result.effects.length > 0) {
        armedBombsRef.current = result.armedBombs;
        setArmedBombs(result.armedBombs);

        const newAnimatedBlasts = result.detonatedBombs.map((bomb) =>
          createAnimatedBlastEffect(bomb, nowMs)
        );
        if (newAnimatedBlasts.length > 0) {
          const combinedBlasts = activeBlastEffectsRef.current.concat(newAnimatedBlasts);
          activeBlastEffectsRef.current = combinedBlasts;
          setActiveBlastEffects(combinedBlasts);
        }

        const newShockwaves = result.detonatedBombs.map((bomb) =>
          createShockwaveEffect(bomb, nowMs, canvasBoundsRef.current)
        );
        if (newShockwaves.length > 0) {
          const combined = coalesceShockwaves(activeShockwavesRef.current, newShockwaves, 50);
          activeShockwavesRef.current = combined;
          setActiveShockwaves(combined);
        }

        playBombExplodeSound();
      }

      const blastResolution = resolveAnimatedBlastEffects(activeBlastEffectsRef.current, nowMs);
      if (blastResolution.completedEffects.length > 0) {
        const persistentEffects = blastResolution.completedEffects.map(createPersistentEraseEffect);
        const patches = rasterizeExplosionPicture(
          persistentEffects,
          canvasBoundsRef.current
        );
        const nextEmojiPicture = recordPicture(
          committedEmojiPictureRef.current,
          [],
          patches.length === 0 ? persistentEffects : undefined,
          patches
        );
        commitPicture(nextEmojiPicture);
      }
      if (blastResolution.activeEffects.length !== activeBlastEffectsRef.current.length) {
        activeBlastEffectsRef.current = blastResolution.activeEffects;
        setActiveBlastEffects(blastResolution.activeEffects);
      }

      const remainingShockwaves = resolveActiveShockwaves(activeShockwavesRef.current, nowMs);
      if (remainingShockwaves.length !== activeShockwavesRef.current.length) {
        activeShockwavesRef.current = remainingShockwaves;
        setActiveShockwaves(remainingShockwaves);
      }

      const swirlResolution = resolveSwirlEffects(activeSwirlsRef.current, nowMs);
      if (swirlResolution.completedEffects.length > 0) {
        const bakedPicture = bakeSwirlEffectsIntoPicture(
          committedEmojiPictureRef.current,
          swirlResolution.completedEffects,
          canvasBoundsRef.current,
          devicePixelRatioRef.current
        );
        if (bakedPicture !== committedEmojiPictureRef.current) {
          commitPicture(bakedPicture);
        }
      }
      if (swirlResolution.activeEffects.length !== activeSwirlsRef.current.length) {
        activeSwirlsRef.current = swirlResolution.activeEffects;
        setActiveSwirls(swirlResolution.activeEffects);
      }

    }, 16);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeBlastEffects.length, activeShockwaves.length, activeSwirls.length, armedBombs.length, commitPicture]);

  const commitStamps = useCallback((stamps: EmojiStamp[]) => {
    const picture = recordPicture(committedEmojiPictureRef.current, stamps);
    commitPicture(picture);
  }, [commitPicture]);

  const armBombStamps = useCallback((stamps: EmojiStamp[]) => {
    if (stamps.length === 0) {
      return;
    }

    const nextBombs = armedBombsRef.current.concat(stamps);
    armedBombsRef.current = nextBombs;
    setArmedBombs(nextBombs);
    setBombAnimationTick(performance.now());

    playBombSizzleSound();
  }, []);

  const startSwirlStamps = useCallback((stamps: EmojiStamp[]) => {
    if (stamps.length === 0) {
      return;
    }

    const nowMs = performance.now();
    const incoming = stamps.map((stamp) => createSwirlEffect(stamp, nowMs, canvasBoundsRef.current));
    const nextSwirls = appendConcurrentSwirls(activeSwirlsRef.current, incoming, 4);
    activeSwirlsRef.current = nextSwirls;
    setActiveSwirls(nextSwirls);
    setBombAnimationTick(nowMs);
  }, []);

  const flushQueuedPoints = useCallback(
    (nowMs: number) => {
      const result = flushQueuedPointsToFrame({
        activeStamps: activeStampsRef.current,
        queuedPoints: queuedPointsRef.current,
        emoji: selectedEmojiRef.current,
        size: brushSizeRef.current,
        nextId: idCounterRef.current,
        nowMs,
        lastPlayedAtMs: lastPlayedAtRef.current,
        minPlayIntervalMs: getMinPlayIntervalForEmoji(selectedEmojiRef.current),
      });

      if (result.activeStamps === activeStampsRef.current) {
        return;
      }

      queuedPointsRef.current = [];
      activeStampsRef.current = result.activeStamps;
      idCounterRef.current = result.nextId;
      lastPlayedAtRef.current = result.lastPlayedAtMs;
      setActiveStamps(result.activeStamps);

      const newSwirlStamps = result.newStamps.filter(isSwirlStamp);
      if (newSwirlStamps.length > 0) {
        const latestSwirlStamp = newSwirlStamps[newSwirlStamps.length - 1];
        startSwirlStamps([latestSwirlStamp]);
      }

      if (result.playback) {
        if (!isSwirlEmoji(result.playback.emoji)) {
          playEmojiPlacementSound(result.playback.emoji, result.playback.stampCount);
        }
      }
    },
    [startSwirlStamps]
  );

  const scheduleFlush = useCallback(() => {
    if (frameRequestRef.current !== null) {
      return;
    }

    frameRequestRef.current = requestAnimationFrame((frameTime) => {
      frameRequestRef.current = null;
      flushQueuedPoints(frameTime);
    });
  }, [flushQueuedPoints]);

  const queuePoints = useCallback(
    (points: CanvasPoint[]) => {
      if (points.length === 0) return;
      queuedPointsRef.current = queuedPointsRef.current.concat(points);
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const beginStroke = useCallback(
    (point: CanvasPoint, bounds: CanvasBounds) => {
      canvasBoundsRef.current = bounds;
      const clampedPoint = clampPointToBounds(point, bounds);
      lastPointRef.current = clampedPoint;
      strokeStartPointRef.current = clampedPoint;

      if (isTruckEmoji(selectedEmojiRef.current)) {
        stopSwirlDragSound();
        activeTruckMoveRef.current = null;
        setActiveTruckMove(null);
        playTruckDragSound();
        return;
      }

      if (isSwirlEmoji(selectedEmojiRef.current)) {
        playSwirlDragSound();
      }

      queuePoints([clampedPoint]);
    },
    [queuePoints]
  );

  const continueStroke = useCallback(
    (point: CanvasPoint, bounds: CanvasBounds) => {
      canvasBoundsRef.current = bounds;
      const clampedPoint = clampPointToBounds(point, bounds);
      const lastPoint = lastPointRef.current;
      const strokeStartPoint = strokeStartPointRef.current;

      if (isTruckEmoji(selectedEmojiRef.current) && strokeStartPoint) {
        const effect = createTruckMoveEffect({
          id: activeTruckMoveRef.current?.id ?? `truck:${idCounterRef.current + 1}`,
          size: brushSizeRef.current,
          anchor: strokeStartPoint,
          current: clampedPoint,
        });
        if (hasTruckMoveDelta(effect)) {
          activeTruckMoveRef.current = effect;
          setActiveTruckMove(effect);
        } else {
          activeTruckMoveRef.current = null;
          setActiveTruckMove(null);
        }
        lastPointRef.current = clampedPoint;
        return;
      }

      if (!lastPoint) {
        lastPointRef.current = clampedPoint;
        queuePoints([clampedPoint]);
        return;
      }

      const interpolated = createInterpolatedStamps(
        lastPoint,
        clampedPoint,
        brushSize,
        STAMP_SPACING_RATIO
      );

      queuePoints(interpolated);
      lastPointRef.current = clampedPoint;
    },
    [brushSize, queuePoints]
  );

  const endStroke = useCallback(() => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
      frameRequestRef.current = null;
    }
    flushQueuedPoints(performance.now());

    const stampsToCommit = activeStampsRef.current;
    if (stampsToCommit.length > 0) {
      const bombStamps = stampsToCommit.filter(isBombStamp);
      const swirlStamps = stampsToCommit.filter(isSwirlStamp);
      const regularStamps = stampsToCommit.filter(
        (stamp) => !isBombStamp(stamp) && !isSwirlStamp(stamp)
      );

      if (regularStamps.length > 0) {
        commitStamps(regularStamps);
      }

      if (swirlStamps.length > 0) {
        commitStamps(swirlStamps);
        playEmojiPlacementSound(swirlStamps[0].emoji, swirlStamps.length);
      }

      if (bombStamps.length > 0) {
        armBombStamps(bombStamps);
      }
    }

    const truckMove = activeTruckMoveRef.current;
    if (truckMove) {
      const shouldPlayEndSound = hasTruckMoveDelta(truckMove);
      if (shouldPlayEndSound) {
        const nextPicture = bakeTruckMoveIntoPicture(
          committedEmojiPictureRef.current,
          truckMove,
          canvasBoundsRef.current,
          devicePixelRatioRef.current
        );
        if (nextPicture !== committedEmojiPictureRef.current) {
          commitPicture(nextPicture);
        }
      }
      stopTruckDragSound(shouldPlayEndSound);
    } else if (isTruckEmoji(selectedEmojiRef.current)) {
      stopTruckDragSound(false);
    }
    if (isSwirlEmoji(selectedEmojiRef.current)) {
      stopSwirlDragSound();
    }

    activeStampsRef.current = [];
    setActiveStamps([]);
    activeTruckMoveRef.current = null;
    setActiveTruckMove(null);
    queuedPointsRef.current = [];
    lastPointRef.current = null;
    strokeStartPointRef.current = null;
  }, [armBombStamps, commitPicture, commitStamps, flushQueuedPoints]);

  const updateBrushSize = useCallback((nextSize: number) => {
    setBrushSize(clampBrushSize(nextSize, BRUSH_SIZE_LIMITS.min, BRUSH_SIZE_LIMITS.max));
  }, []);

  const clearCanvas = useCallback(() => {
    resetInFlightDrawingState();
    if (committedEmojiPictureRef.current !== null) {
      commitPicture(null);
    }
    idCounterRef.current = 0;
    canvasBoundsRef.current = { width: 0, height: 0 };
  }, [commitPicture, resetInFlightDrawingState]);

  const saveDrawing = useCallback(async () => {
    const picture = committedEmojiPictureRef.current;
    const bounds = canvasBoundsRef.current;
    if (!picture || bounds.width <= 0 || bounds.height <= 0) {
      return false;
    }

    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (!surface) {
      return false;
    }

    let fileUri: string | null = null;
    let snapshot: ReturnType<typeof surface.makeImageSnapshot> | null = null;
    try {
      const canvas = surface.getCanvas();
      canvas.clear(Skia.Color('white'));
      canvas.drawPicture(picture);
      surface.flush();

      snapshot = surface.makeImageSnapshot();
      const base64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
      if (!base64 || !FileSystem.cacheDirectory) {
        return false;
      }

      fileUri = `${FileSystem.cacheDirectory}emoji-draw-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        return false;
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);
      return true;
    } catch {
      return false;
    } finally {
      if (fileUri) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
      }
      snapshot?.dispose();
      surface.dispose();
    }
  }, []);

  const undo = useCallback(() => {
    const previousPicture = historyPastRef.current.at(-1);
    if (previousPicture === undefined) {
      return;
    }

    historyPastRef.current = historyPastRef.current.slice(0, -1);
    historyFutureRef.current = [committedEmojiPictureRef.current, ...historyFutureRef.current];
    setCanUndo(historyPastRef.current.length > 0);
    setCanRedo(historyFutureRef.current.length > 0);
    committedEmojiPictureRef.current = previousPicture;
    setCommittedEmojiPicture(previousPicture);
    resetInFlightDrawingState();
    playUndoSound();
  }, [resetInFlightDrawingState]);

  const redo = useCallback(() => {
    const nextPicture = historyFutureRef.current[0];
    if (nextPicture === undefined) {
      return;
    }

    historyFutureRef.current = historyFutureRef.current.slice(1);
    historyPastRef.current = historyPastRef.current.concat(committedEmojiPictureRef.current);
    setCanUndo(historyPastRef.current.length > 0);
    setCanRedo(historyFutureRef.current.length > 0);
    committedEmojiPictureRef.current = nextPicture;
    setCommittedEmojiPicture(nextPicture);
    resetInFlightDrawingState();
    playRedoSound();
  }, [resetInFlightDrawingState]);

  return useMemo(
    () => ({
      brushSize,
      selectedEmoji,
      activeStamps,
      armedBombs,
      activeBlastEffects,
      activeShockwaves,
      activeSwirls,
      activeTruckMove,
      bombAnimationTick,
      committedEmojiPicture,
      recentEmojis: STARTER_RECENT_EMOJIS,
      setSelectedEmoji,
      updateBrushSize,
      beginStroke,
      continueStroke,
      endStroke,
      clearCanvas,
      saveDrawing,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      activeStamps,
      armedBombs,
      activeBlastEffects,
      activeShockwaves,
      activeSwirls,
      activeTruckMove,
      beginStroke,
      bombAnimationTick,
      brushSize,
      canRedo,
      canUndo,
      clearCanvas,
      committedEmojiPicture,
      continueStroke,
      endStroke,
      saveDrawing,
      redo,
      selectedEmoji,
      undo,
      updateBrushSize,
    ]
  );
}
