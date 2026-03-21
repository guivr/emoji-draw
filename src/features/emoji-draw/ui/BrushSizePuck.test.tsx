import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import {
    BrushSizePuck,
    brushSizeToSliderRatio,
    getBrushSizeFillWidth,
    getBrushSizeFromTouchX,
    getBrushSizeThumbLeft,
    getBrushTrackWidth,
} from '@/features/emoji-draw/ui/BrushSizePuck';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');

  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      Text: ReactNative.Text,
    },
    runOnJS: (callback: (...args: unknown[]) => void) => callback,
    useAnimatedStyle: (callback: () => unknown) => callback(),
    useSharedValue: (value: number) => ({ value }),
    withSpring: (value: number) => value,
  };
});

jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => ({
      onStart() {
        return this;
      },
      onUpdate() {
        return this;
      },
      onFinalize() {
        return this;
      },
    }),
  },
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      background: '#FFFFFF',
      backgroundElement: '#F0F0F3',
      backgroundSelected: '#D9DDE6',
      tint: '#1D72F2',
      text: '#111111',
      icon: '#60646C',
    },
  },
  Spacing: {
    one: 4,
    two: 8,
  },
}));

function mockAnimatedTiming(
  value: { setValue?: (nextValue: number) => void } | undefined,
  config?: { toValue?: number }
) {
  return {
    start: (callback?: (result: { finished: boolean }) => void) => {
      if (typeof value?.setValue === 'function' && typeof config?.toValue === 'number') {
        value.setValue(config.toValue);
      }

      callback?.({ finished: true });
    },
  } as Animated.CompositeAnimation;
}

describe('BrushSizePuck', () => {
  beforeEach(() => {
    jest.spyOn(Animated, 'timing').mockImplementation(mockAnimatedTiming);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('maps touch positions to clamped brush sizes', () => {
    expect(getBrushSizeFromTouchX({ touchX: 0, width: 200, min: 18, max: 92 })).toBe(18);
    expect(getBrushSizeFromTouchX({ touchX: 200, width: 200, min: 18, max: 92 })).toBe(92);
    expect(getBrushSizeFromTouchX({ touchX: -20, width: 200, min: 18, max: 92 })).toBe(18);
    expect(getBrushSizeFromTouchX({ touchX: 220, width: 200, min: 18, max: 92 })).toBe(92);
  });

  test('maps brush size to a 0..1 slider ratio', () => {
    expect(brushSizeToSliderRatio({ value: 18, min: 18, max: 92 })).toBe(0);
    expect(brushSizeToSliderRatio({ value: 92, min: 18, max: 92 })).toBe(1);
    expect(brushSizeToSliderRatio({ value: 55, min: 18, max: 92 })).toBeCloseTo(0.5, 1);
  });

  test('does not force a large blue fill at the minimum size', () => {
    expect(getBrushSizeFillWidth({ value: 18, min: 18, max: 92, width: 200 })).toBe(0);
    expect(getBrushSizeFillWidth({ value: 92, min: 18, max: 92, width: 200 })).toBe(200);
  });

  test('max blue fill stays inside the slider track', () => {
    const trackWidth = getBrushTrackWidth(200);

    expect(trackWidth).toBeLessThan(200);
    expect(getBrushSizeFillWidth({ value: 92, min: 18, max: 92, width: trackWidth })).toBe(trackWidth);
  });

  test('animates the thumb when tapping far from the current size', () => {
    const springSpy = jest.spyOn(Animated, 'spring').mockImplementation(
      () =>
        ({
          start: jest.fn(),
        }) as unknown as Animated.CompositeAnimation
    );
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={18} min={18} max={92} onChange={jest.fn()} />);
    });

    const slider = tree.root.findByProps({ testID: 'brush-size-slider' });

    act(() => {
      slider.props.onLayout({
        nativeEvent: {
          layout: { width: 200 },
        },
      });
    });

    springSpy.mockClear();

    act(() => {
      slider.props.onResponderGrant({
        nativeEvent: {
          locationX: 200,
        },
      });
    });

    expect(springSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        useNativeDriver: false,
      })
    );
  });

  test('updates size from touch drag and accessibility actions', () => {
    const onChange = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={40} min={18} max={92} onChange={onChange} />);
    });

    const slider = tree.root.findByProps({ testID: 'brush-size-slider' });

    act(() => {
      slider.props.onLayout({
        nativeEvent: {
          layout: { width: 200 },
        },
      });
    });

    act(() => {
      slider.props.onResponderGrant({
        nativeEvent: {
          locationX: 200,
        },
      });
    });

    act(() => {
      slider.props.onResponderMove({
        nativeEvent: {
          locationX: 0,
        },
      });
    });

    act(() => {
      slider.props.onAccessibilityAction({
        nativeEvent: {
          actionName: 'increment',
        },
      });
    });

    expect(onChange).toHaveBeenNthCalledWith(1, 92);
    expect(onChange).toHaveBeenNthCalledWith(2, 18);
    expect(onChange).toHaveBeenNthCalledWith(3, 19);
  });

  test('plus and minus buttons are clickable and step the value', () => {
    const onChange = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={40} min={18} max={92} onChange={onChange} />);
    });

    const incrementButton = tree.root.findByProps({ testID: 'brush-size-increment' });
    const decrementButton = tree.root.findByProps({ testID: 'brush-size-decrement' });

    act(() => {
      incrementButton.props.onPress();
      decrementButton.props.onPress();
    });

    expect(onChange).toHaveBeenNthCalledWith(1, 41);
    expect(onChange).toHaveBeenNthCalledWith(2, 40);
  });

  test('renders minus on the left and plus on the right', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={40} min={18} max={92} onChange={jest.fn()} />);
    });

    const root = tree.root.findByProps({ testID: 'brush-size-root' });
    const children = React.Children.toArray(root.props.children);

    expect((children[0] as React.ReactElement).props.testID).toBe('brush-size-decrement');
    expect((children[2] as React.ReactElement).props.testID).toBe('brush-size-increment');
  });

  test('enlarges the size bubble in place while dragging, then resets on release', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={55} min={18} max={92} onChange={jest.fn()} />);
    });

    const slider = tree.root.findByProps({ testID: 'brush-size-slider' });
    const thumb = () => tree.root.findByProps({ testID: 'brush-size-thumb' });
    const thumbLabel = () => tree.root.findByProps({ testID: 'brush-size-thumb-label' });

    act(() => {
      slider.props.onLayout({
        nativeEvent: {
          layout: { width: 200 },
        },
      });
    });

    const restingStyle = StyleSheet.flatten(thumb().props.style);
    const restingCenterY = restingStyle.top + restingStyle.height / 2;
    const restingWidth = restingStyle.width;
    const restingLabelStyle = StyleSheet.flatten(thumbLabel().props.style);

    act(() => {
      slider.props.onResponderGrant({
        nativeEvent: {
          locationX: 100,
        },
      });
    });

    const draggingStyle = StyleSheet.flatten(thumb().props.style);
    const restingLeft = getBrushSizeThumbLeft({
      value: 55,
      min: 18,
      max: 92,
      sliderWidth: 200,
      thumbSize: 34,
    });
    const draggingLeft = getBrushSizeThumbLeft({
      value: 55,
      min: 18,
      max: 92,
      sliderWidth: 200,
      thumbSize: 54,
    });

    expect(draggingLeft + 54 / 2).toBe(restingLeft + 34 / 2);
    expect(draggingStyle.top + draggingStyle.height / 2).toBe(restingCenterY);

    act(() => {
      slider.props.onResponderRelease();
    });

    const releasedStyle = StyleSheet.flatten(thumb().props.style);

    expect(releasedStyle.top + releasedStyle.height / 2).toBe(restingCenterY);
    expect(releasedStyle.width).toBe(restingWidth);
  });

  test('animates thumb width height and font size directly', () => {
    const timingSpy = jest.spyOn(Animated, 'timing');
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={40} min={18} max={92} onChange={jest.fn()} />);
    });

    const slider = tree.root.findByProps({ testID: 'brush-size-slider' });

    act(() => {
      slider.props.onResponderGrant({
        nativeEvent: {
          locationX: 120,
        },
      });
    });

    act(() => {
      slider.props.onResponderRelease();
    });

    const sizeAnimationCalls = timingSpy.mock.calls.filter(([, config]) => config?.useNativeDriver === false);
    const targetValues = sizeAnimationCalls
      .map(([, config]) => config?.toValue)
      .filter((value) => typeof value === 'number');

    expect(targetValues).toEqual(expect.arrayContaining([54, 34, 16, 11]));
  });

  test('renders only the size number in the thumb', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={40} min={18} max={92} onChange={jest.fn()} />);
    });

    expect(tree.root.findAllByProps({ testID: 'brush-size-thumb-emoji' })).toHaveLength(0);
    expect(tree.root.findByProps({ testID: 'brush-size-thumb-label' }).props.children).toBe(40);
  });

  test('plus and minus buttons render without colored borders', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<BrushSizePuck value={40} min={18} max={92} onChange={jest.fn()} />);
    });

    const incrementButton = tree.root.findByProps({ testID: 'brush-size-increment' });
    const decrementButton = tree.root.findByProps({ testID: 'brush-size-decrement' });

    const incrementStyle = StyleSheet.flatten(incrementButton.props.style);
    const decrementStyle = StyleSheet.flatten(decrementButton.props.style);

    expect(incrementStyle.borderWidth ?? 0).toBe(0);
    expect(decrementStyle.borderWidth ?? 0).toBe(0);
    expect(incrementStyle.borderColor).toBeUndefined();
    expect(decrementStyle.borderColor).toBeUndefined();
  });
});
