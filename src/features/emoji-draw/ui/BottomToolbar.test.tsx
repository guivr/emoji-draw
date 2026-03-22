import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, ScrollView, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import {
  playBombSizzleSound,
  playEmojiPlacementSound,
} from '@/features/emoji-draw/model/emoji-sound-player';
import { BOMB_EMOJI } from '@/features/emoji-draw/model/types';
import { BottomToolbar } from '@/features/emoji-draw/ui/BottomToolbar';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
}));

jest.mock('@/features/emoji-draw/model/emoji-sound-player', () => ({
  playEmojiPlacementSound: jest.fn(),
  playBombSizzleSound: jest.fn(),
}));

jest.mock('@/features/emoji-draw/ui/BrushSizePuck', () => ({
  BrushSizePuck: () => {
    const ReactNative = require('react-native');
    return <ReactNative.View testID="brush-size-puck" />;
  },
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      background: '#F8F9FB',
      backgroundTransparent: '#F8F9FB00',
      backgroundElement: '#F0F0F3',
      backgroundSelected: '#E0E1E6',
    },
    dark: {
      background: '#000000',
      backgroundTransparent: '#00000000',
      backgroundElement: '#212225',
      backgroundSelected: '#2E3135',
    },
  },
  Spacing: {
    two: 8,
    three: 16,
  },
}));

const mockedUseColorScheme = jest.requireMock('@/hooks/use-color-scheme').useColorScheme as jest.Mock;

describe('BottomToolbar', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it('animates emoji button size and font with a 150ms ease-out timing transition', () => {
    const timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: jest.fn(),
        }) as unknown as Animated.CompositeAnimation
    );
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={jest.fn()}
        />
      );
    });

    timingSpy.mockClear();

    act(() => {
      tree.update(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🔥"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={jest.fn()}
        />
      );
    });

    const sizeAnimationCalls = timingSpy.mock.calls.filter(([, config]) => config?.useNativeDriver === false);
    const targetValues = sizeAnimationCalls
      .map(([, config]) => config?.toValue)
      .filter((value) => typeof value === 'number');

    expect(sizeAnimationCalls).not.toHaveLength(0);
    expect(targetValues).toEqual(expect.arrayContaining([44, 60, 22, 35]));
    expect(
      sizeAnimationCalls.every(
        ([, config]) => config?.duration === 150 && typeof config?.easing === 'function'
      )
    ).toBe(true);
  });

  it('runs a 3d coin flip timing animation when a new emoji becomes selected', () => {
    const timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: jest.fn(),
        }) as unknown as Animated.CompositeAnimation
    );
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={jest.fn()}
        />
      );
    });

    timingSpy.mockClear();

    act(() => {
      tree.update(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🔥"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={jest.fn()}
        />
      );
    });

    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        useNativeDriver: true,
      })
    );
  });

  it('replays the 3d coin flip when tapping the already selected emoji', () => {
    const timingSpy = jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: jest.fn(),
        }) as unknown as Animated.CompositeAnimation
    );
    const onSelectEmoji = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={onSelectEmoji}
        />
      );
    });

    timingSpy.mockClear();

    const selectedButton = tree.root.findByProps({ accessibilityLabel: 'Select 🙂' });

    act(() => {
      selectedButton.props.onPress();
    });

    expect(onSelectEmoji).not.toHaveBeenCalled();
    expect(playEmojiPlacementSound).toHaveBeenCalledWith('🙂');
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        useNativeDriver: true,
      })
    );
  });

  it('renders the size slider below the emoji strip', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={jest.fn()}
        />
      );
    });

    const root = tree.root.findByProps({ testID: 'bottom-toolbar-root' });
    const emojiSection = tree.root.findByProps({ testID: 'bottom-toolbar-emoji-section' });
    const sliderRow = tree.root.findByProps({ testID: 'bottom-toolbar-slider-row' });

    expect(StyleSheet.flatten(root.props.style)).toEqual(expect.objectContaining({ flexDirection: 'column' }));
    expect(StyleSheet.flatten(emojiSection.props.style)).toEqual(
      expect.objectContaining({ flexDirection: 'row' })
    );
    expect(StyleSheet.flatten(sliderRow.props.style)).toEqual(expect.objectContaining({ width: '100%' }));
  });

  it('vibrates and updates selection when a different emoji is pressed', () => {
    const onSelectEmoji = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={onSelectEmoji}
        />
      );
    });

    const fireButton = tree.root.findByProps({ accessibilityLabel: 'Select 🔥' });

    act(() => {
      fireButton.props.onPress();
    });

    expect(onSelectEmoji).toHaveBeenCalledWith('🔥');
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    expect(playEmojiPlacementSound).toHaveBeenCalledWith('🔥');
  });

  it('supports selecting the bomb emoji option from the toolbar', () => {
    const onSelectEmoji = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', BOMB_EMOJI, '🔥']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={onSelectEmoji}
        />
      );
    });

    const bombButton = tree.root.findByProps({ accessibilityLabel: `Select ${BOMB_EMOJI}` });

    act(() => {
      bombButton.props.onPress();
    });

    expect(onSelectEmoji).toHaveBeenCalledWith(BOMB_EMOJI);
    expect(playBombSizzleSound).toHaveBeenCalled();
    expect(playEmojiPlacementSound).not.toHaveBeenCalledWith(BOMB_EMOJI);
  });

  it('uses alpha-faded light background stops instead of transparent black', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <BottomToolbar
          brushSize={24}
          selectedEmoji="🙂"
          recentEmojis={['🙂', '🔥', '🎉']}
          onBrushSizeChange={jest.fn()}
          onSelectEmoji={jest.fn()}
        />
      );
    });

    const stripScroll = tree.root.findByType(ScrollView);
    act(() => {
      stripScroll.props.onLayout({ nativeEvent: { layout: { width: 120 } } });
      stripScroll.props.onContentSizeChange(300, 50);
    });

    const fades = tree.root.findAllByType(LinearGradient);
    expect(fades.length).toBeGreaterThan(0);
    const validStops = new Set(['#F8F9FB', '#F8F9FB00']);
    expect(
      fades.every((fade: renderer.ReactTestInstance) =>
        (fade.props.colors as string[]).every((stop) => validStops.has(stop))
      )
    ).toBe(true);
    expect(
      fades.every((fade: renderer.ReactTestInstance) =>
        !(fade.props.colors as string[]).includes('transparent')
      )
    ).toBe(true);
  });
});
