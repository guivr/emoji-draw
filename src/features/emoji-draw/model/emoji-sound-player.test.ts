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

    expect(createAudioPlayer).toHaveBeenCalledTimes(17);
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
});
