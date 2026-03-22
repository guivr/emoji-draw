import type { AudioPlayer, AudioSource } from 'expo-audio';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { getSoundSourceForPlacement } from '@/features/emoji-draw/model/emoji-sound';

const playerCache = new Map<string, AudioPlayer>();
let placementCounter = 0;
const SEQUENCE_LENGTH = 12;
const PRIME_STAGGER_MS = 80;

const BOMB_SIZZLE_SOURCE: AudioSource = require('../../../../assets/audio/placements/bomb_sizzle.wav');
const BOMB_EXPLODE_SOURCE: AudioSource = require('../../../../assets/audio/placements/bomb_explode.wav');
const SWIRL_DRAG_SOURCE: AudioSource = require('../../../../assets/audio/placements/swirl_01.wav');
const TRUCK_DRAG_SOURCE: AudioSource = require('../../../../assets/audio/placements/truck_drag_01.mp3');
const TRUCK_END_SOURCE: AudioSource = require('../../../../assets/audio/placements/truck_end_01.mp3');
const UNDO_SOURCES: readonly AudioSource[] = [
  require('../../../../assets/audio/undo/undo_01.mp3'),
  require('../../../../assets/audio/undo/undo_02.mp3'),
  require('../../../../assets/audio/undo/undo_03.mp3'),
];
const REDO_SOURCES: readonly AudioSource[] = [
  require('../../../../assets/audio/redo/redo_01.mp3'),
  require('../../../../assets/audio/redo/redo_02.mp3'),
];
const SAVE_SOURCE: AudioSource = require('../../../../assets/audio/save/save_01.mp3');
const SWIRL_DRAG_LOOP_MS = 320;
const TRUCK_DRAG_LOOP_MS = 900;
let swirlDragTimer: ReturnType<typeof setInterval> | null = null;
let truckDragTimer: ReturnType<typeof setInterval> | null = null;
let undoCounter = 0;
let redoCounter = 0;

function getOrCreatePlayer(
  cacheKey: string,
  source: ReturnType<typeof getSoundSourceForPlacement>['source']
) {
  const cachedPlayer = playerCache.get(cacheKey);
  if (cachedPlayer) {
    return cachedPlayer;
  }

  const player = createAudioPlayer(source, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  playerCache.set(cacheKey, player);
  return player;
}

async function restartPlayer(player: AudioPlayer) {
  try {
    await player.seekTo(0);
  } catch {
    // Some players can fail seeking while still being playable.
  }

  player.play();
}

export function primeEmojiPlacementAudio() {
  void setAudioModeAsync({ playsInSilentMode: true });
  getOrCreatePlayer('bomb:sizzle', BOMB_SIZZLE_SOURCE);
  getOrCreatePlayer('bomb:explode', BOMB_EXPLODE_SOURCE);
  getOrCreatePlayer('swirl:drag', SWIRL_DRAG_SOURCE);
  getOrCreatePlayer('truck:drag', TRUCK_DRAG_SOURCE);
  getOrCreatePlayer('truck:end', TRUCK_END_SOURCE);
  getOrCreatePlayer('undo:0', UNDO_SOURCES[0]);
  getOrCreatePlayer('undo:1', UNDO_SOURCES[1]);
  getOrCreatePlayer('undo:2', UNDO_SOURCES[2]);
  getOrCreatePlayer('redo:0', REDO_SOURCES[0]);
  getOrCreatePlayer('redo:1', REDO_SOURCES[1]);
  getOrCreatePlayer('save:0', SAVE_SOURCE);

  for (let i = 0; i < SEQUENCE_LENGTH; i++) {
    setTimeout(() => {
      const { source, cacheKey } = getSoundSourceForPlacement('_prime_', i);
      getOrCreatePlayer(cacheKey, source);
    }, i * PRIME_STAGGER_MS);
  }
}

export function playTruckDragSound() {
  stopTruckDragSound(false);
  try {
    const player = getOrCreatePlayer('truck:drag', TRUCK_DRAG_SOURCE);
    void restartPlayer(player);
    truckDragTimer = setInterval(() => {
      void restartPlayer(player);
    }, TRUCK_DRAG_LOOP_MS);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playSwirlDragSound() {
  stopSwirlDragSound();
  try {
    const player = getOrCreatePlayer('swirl:drag', SWIRL_DRAG_SOURCE);
    void restartPlayer(player);
    swirlDragTimer = setInterval(() => {
      void restartPlayer(player);
    }, SWIRL_DRAG_LOOP_MS);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function stopSwirlDragSound() {
  let dragPlayer: AudioPlayer | null = null;
  try {
    dragPlayer = getOrCreatePlayer('swirl:drag', SWIRL_DRAG_SOURCE);
  } catch {
    dragPlayer = null;
  }

  if (swirlDragTimer !== null) {
    clearInterval(swirlDragTimer);
    swirlDragTimer = null;
  }

  if (dragPlayer && 'pause' in dragPlayer && typeof dragPlayer.pause === 'function') {
    try {
      void dragPlayer.pause();
      void dragPlayer.seekTo(0);
    } catch {
      // Keep drawing responsive even if audio fails.
    }
  }
}

export function stopTruckDragSound(playEndSound = true) {
  let dragPlayer: AudioPlayer | null = null;
  try {
    dragPlayer = getOrCreatePlayer('truck:drag', TRUCK_DRAG_SOURCE);
  } catch {
    dragPlayer = null;
  }

  if (truckDragTimer !== null) {
    clearInterval(truckDragTimer);
    truckDragTimer = null;
  }
  if (dragPlayer && 'pause' in dragPlayer && typeof dragPlayer.pause === 'function') {
    try {
      void dragPlayer.pause();
      void dragPlayer.seekTo(0);
    } catch {
      // Keep drawing responsive even if audio fails.
    }
  }

  if (!playEndSound) {
    return;
  }

  try {
    const player = getOrCreatePlayer('truck:end', TRUCK_END_SOURCE);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playEmojiPlacementSound(emoji: string, stampCount = 1) {
  const safeStampCount = Math.max(1, stampCount);
  const { source, cacheKey } = getSoundSourceForPlacement(emoji, placementCounter);
  placementCounter += safeStampCount;

  try {
    const player = getOrCreatePlayer(cacheKey, source);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playBombSizzleSound() {
  try {
    const player = getOrCreatePlayer('bomb:sizzle', BOMB_SIZZLE_SOURCE);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playBombExplodeSound() {
  try {
    const player = getOrCreatePlayer('bomb:explode', BOMB_EXPLODE_SOURCE);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playUndoSound() {
  const sourceIndex = undoCounter % UNDO_SOURCES.length;
  const source = UNDO_SOURCES[sourceIndex];
  undoCounter += 1;
  const cacheKey = `undo:${sourceIndex}`;

  try {
    const player = getOrCreatePlayer(cacheKey, source);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playRedoSound() {
  const sourceIndex = redoCounter % REDO_SOURCES.length;
  const source = REDO_SOURCES[sourceIndex];
  redoCounter += 1;
  const cacheKey = `redo:${sourceIndex}`;

  try {
    const player = getOrCreatePlayer(cacheKey, source);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}

export function playSaveSound() {
  try {
    const player = getOrCreatePlayer('save:0', SAVE_SOURCE);
    void restartPlayer(player);
  } catch {
    // Keep drawing responsive even if audio fails.
  }
}
