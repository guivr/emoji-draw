jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    seekTo: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    play: jest.fn(),
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/emoji-draw/model/emoji-sound', () => ({
  getSoundSourceForPlacement: jest.fn((_emoji: string, index: number) => ({
    source: `source-${index}`,
    cacheKey: `placement:${index}`,
  })),
}));

describe('emoji-sound-player', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('primeEmojiPlacementAudio also primes bomb audio players', () => {
    let primeEmojiPlacementAudio: (() => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      primeEmojiPlacementAudio = module.primeEmojiPlacementAudio;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    primeEmojiPlacementAudio?.();
    jest.runAllTimers();

    expect(createAudioPlayer).toHaveBeenCalledTimes(23);
    expect(createAudioPlayer?.mock.calls[0]?.[0]).not.toEqual(expect.stringContaining('source-'));
    expect(createAudioPlayer?.mock.calls[1]?.[0]).not.toEqual(expect.stringContaining('source-'));
  });

  test('starts and stops truck drag loop audio, then plays end sound', async () => {
    let playTruckDragSound: (() => void) | undefined;
    let stopTruckDragSound: ((playEndSound?: boolean) => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      playTruckDragSound = module.playTruckDragSound;
      stopTruckDragSound = module.stopTruckDragSound;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    playTruckDragSound?.();
    jest.advanceTimersByTime(1400);
    await Promise.resolve();

    const dragPlayer = createAudioPlayer?.mock.results[0]?.value;
    expect(dragPlayer.play).toHaveBeenCalledTimes(2);

    stopTruckDragSound?.(true);
    await Promise.resolve();
    const endPlayer = createAudioPlayer?.mock.results[1]?.value;
    expect(endPlayer.play).toHaveBeenCalledTimes(1);
    expect(dragPlayer.pause).toHaveBeenCalled();
  });

  test('starts and stops swirl drag loop audio', async () => {
    let playSwirlDragSound: (() => void) | undefined;
    let stopSwirlDragSound: (() => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      playSwirlDragSound = module.playSwirlDragSound;
      stopSwirlDragSound = module.stopSwirlDragSound;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    playSwirlDragSound?.();
    jest.advanceTimersByTime(700);
    await Promise.resolve();

    const swirlPlayer = createAudioPlayer?.mock.results[0]?.value;
    expect(swirlPlayer.play).toHaveBeenCalledTimes(3);

    stopSwirlDragSound?.();
    await Promise.resolve();
    expect(swirlPlayer.pause).toHaveBeenCalled();
  });

  test('cycles through undo audio variants and reuses cached players', async () => {
    let playUndoSound: (() => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      playUndoSound = module.playUndoSound;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    playUndoSound?.();
    playUndoSound?.();
    playUndoSound?.();
    playUndoSound?.();
    await Promise.resolve();

    expect(createAudioPlayer).toHaveBeenCalledTimes(3);
    const firstUndoPlayer = createAudioPlayer?.mock.results[0]?.value;
    expect(firstUndoPlayer.play).toHaveBeenCalledTimes(2);
  });

  test('cycles through redo audio variants and reuses cached players', async () => {
    let playRedoSound: (() => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      playRedoSound = module.playRedoSound;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    playRedoSound?.();
    playRedoSound?.();
    playRedoSound?.();
    await Promise.resolve();

    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
    const firstRedoPlayer = createAudioPlayer?.mock.results[0]?.value;
    expect(firstRedoPlayer.play).toHaveBeenCalledTimes(2);
  });

  test('plays save sound and reuses cached save player', async () => {
    let playSaveSound: (() => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      playSaveSound = module.playSaveSound;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    playSaveSound?.();
    playSaveSound?.();
    await Promise.resolve();

    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    const savePlayer = createAudioPlayer?.mock.results[0]?.value;
    expect(savePlayer.play).toHaveBeenCalledTimes(2);
  });

  test('does not play effects while sound effects are disabled', async () => {
    let setSoundEffectsEnabled: ((enabled: boolean) => void) | undefined;
    let playSaveSound: (() => void) | undefined;
    let playEmojiPlacementSound: ((emoji: string, stampCount?: number) => void) | undefined;
    let createAudioPlayer: jest.Mock | undefined;

    jest.isolateModules(() => {
      const module = require('@/features/emoji-draw/model/emoji-sound-player');
      setSoundEffectsEnabled = module.setSoundEffectsEnabled;
      playSaveSound = module.playSaveSound;
      playEmojiPlacementSound = module.playEmojiPlacementSound;
      createAudioPlayer = require('expo-audio').createAudioPlayer;
    });

    setSoundEffectsEnabled?.(false);
    playSaveSound?.();
    playEmojiPlacementSound?.('🔥');
    await Promise.resolve();

    expect(createAudioPlayer).not.toHaveBeenCalled();
  });
});
