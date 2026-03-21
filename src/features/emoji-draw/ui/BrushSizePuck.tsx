import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BrushSizePuckProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

type SliderRatioArgs = {
  value: number;
  min: number;
  max: number;
};

type TouchSizeArgs = {
  touchX: number;
  width: number;
  min: number;
  max: number;
};

type TouchInteractionMode = 'idle' | 'drag' | 'jump';

const SLIDER_HEIGHT = 52;
const TRACK_HEIGHT = 12;
const TRACK_HORIZONTAL_INSET = 8;
const THUMB_SIZE = 34;
const DRAGGING_THUMB_SIZE = 54;
const BUTTON_STEP = 1;
const JUMP_ANIMATION_THRESHOLD = 60;
const THUMB_TRANSITION_DURATION_MS = 150;
const positionSpringConfig = {
  damping: 20,
  stiffness: 300,
  mass: 0.8,
  useNativeDriver: false,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function brushSizeToSliderRatio({ value, min, max }: SliderRatioArgs) {
  if (max <= min) {
    return 0;
  }

  return clamp((value - min) / (max - min), 0, 1);
}

export function getBrushSizeFromTouchX({ touchX, width, min, max }: TouchSizeArgs) {
  if (max <= min) {
    return min;
  }

  const clampedTouchX = clamp(touchX, 0, Math.max(width, 1));
  const ratio = clampedTouchX / Math.max(width, 1);
  return Math.round(min + ratio * (max - min));
}

export function getBrushSizeFillWidth({ value, min, max, width }: SliderRatioArgs & { width: number }) {
  return brushSizeToSliderRatio({ value, min, max }) * Math.max(width, 0);
}

export function getBrushTrackWidth(sliderWidth: number) {
  return Math.max(sliderWidth - TRACK_HORIZONTAL_INSET * 2, 0);
}

export function getBrushSizeThumbLeft({
  value,
  min,
  max,
  sliderWidth,
  thumbSize,
}: SliderRatioArgs & { sliderWidth: number; thumbSize: number }) {
  const trackWidth = getBrushTrackWidth(sliderWidth);
  const baseThumbTravel = Math.max(trackWidth - THUMB_SIZE, 0);
  const thumbOffsetAdjustment = (THUMB_SIZE - thumbSize) / 2;

  return TRACK_HORIZONTAL_INSET + brushSizeToSliderRatio({ value, min, max }) * baseThumbTravel + thumbOffsetAdjustment;
}
const AnimatedText = Animated.createAnimatedComponent(Text);

export function BrushSizePuck({ value, min, max, onChange }: BrushSizePuckProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const [sliderWidth, setSliderWidth] = useState(0);
  const [displayValue, setDisplayValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const animatedRatio = useRef(new Animated.Value(brushSizeToSliderRatio({ value, min, max }))).current;
  const animatedThumbSize = useRef(new Animated.Value(THUMB_SIZE)).current;
  const animatedThumbFontSize = useRef(new Animated.Value(11)).current;
  const lastAnnouncedValueRef = useRef(value);
  const liveValueRef = useRef(value);
  const touchModeRef = useRef<TouchInteractionMode>('idle');

  useEffect(() => {
    setDisplayValue(value);
    lastAnnouncedValueRef.current = value;
    liveValueRef.current = value;
  }, [value]);

  useEffect(() => {
    const nextRatio = brushSizeToSliderRatio({ value, min, max });

    if (touchModeRef.current === 'drag') {
      animatedRatio.setValue(nextRatio);
      return;
    }

    if (touchModeRef.current === 'jump') {
      return;
    }

    Animated.spring(animatedRatio, {
      toValue: nextRatio,
      ...positionSpringConfig,
    }).start();
  }, [animatedRatio, isDragging, max, min, value]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedThumbSize, {
        toValue: isDragging ? DRAGGING_THUMB_SIZE : THUMB_SIZE,
        duration: THUMB_TRANSITION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedThumbFontSize, {
        toValue: isDragging ? 16 : 11,
        duration: THUMB_TRANSITION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [animatedThumbFontSize, animatedThumbSize, isDragging]);

  const trackWidth = getBrushTrackWidth(sliderWidth);
  const baseThumbTravel = Math.max(trackWidth - THUMB_SIZE, 0);
  const animatedThumbCenterX = animatedRatio.interpolate({
    inputRange: [0, 1],
    outputRange: [
      TRACK_HORIZONTAL_INSET + THUMB_SIZE / 2,
      TRACK_HORIZONTAL_INSET + THUMB_SIZE / 2 + baseThumbTravel,
    ],
  });
  const animatedThumbLeft = Animated.subtract(animatedThumbCenterX, Animated.divide(animatedThumbSize, 2));
  const animatedFillWidth = animatedRatio.interpolate({
    inputRange: [0, 1],
    outputRange: [0, trackWidth],
  });
  const animatedThumbTop = Animated.divide(Animated.subtract(SLIDER_HEIGHT, animatedThumbSize), 2);

  const commitValue = (nextValue: number) => {
    const clampedValue = clamp(nextValue, min, max);

    setDisplayValue(clampedValue);
    liveValueRef.current = clampedValue;

    if (clampedValue === lastAnnouncedValueRef.current) {
      return;
    }

    lastAnnouncedValueRef.current = clampedValue;
    onChange(clampedValue);
    void Haptics.selectionAsync();
  };

  const updateFromTouch = (touchX: number) => {
    const nextValue = getBrushSizeFromTouchX({
      touchX,
      width: sliderWidth,
      min,
      max,
    });
    const nextRatio = brushSizeToSliderRatio({ value: nextValue, min, max });

    animatedRatio.setValue(nextRatio);
    commitValue(nextValue);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    if (nextWidth > 0) {
      setSliderWidth(nextWidth);
    }
  };

  const handleRelease = () => {
    touchModeRef.current = 'idle';
    setIsDragging(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const accessibilityActions = useMemo(
    () => [{ name: 'increment' as const }, { name: 'decrement' as const }],
    []
  );

  const accentColor = colors.tint ?? '#1D72F2';
  const surfaceColor = colors.background ?? '#FFFFFF';
  const labelColor = colors.text ?? '#111111';
  const trackColor = colors.backgroundSelected;
  const shellColor = colors.backgroundElement;

  return (
    <View testID="brush-size-root" style={styles.wrapper}>
      <Pressable
        testID="brush-size-decrement"
        onPress={() => {
          commitValue(liveValueRef.current - BUTTON_STEP);
        }}
        accessibilityRole="button"
        accessibilityLabel="Decrease brush size"
        style={[styles.endpointButton, { backgroundColor: shellColor }]}>
        <Text style={[styles.endpointLabel, { color: labelColor }]}>-</Text>
      </Pressable>
      <View
        testID="brush-size-slider"
        onLayout={handleLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          setIsDragging(true);
          const touchX = event.nativeEvent.locationX;
          const currentThumbCenterX =
            getBrushSizeThumbLeft({
              value: liveValueRef.current,
              min,
              max,
              sliderWidth,
              thumbSize: THUMB_SIZE,
            }) +
            THUMB_SIZE / 2;
          const distanceFromThumb = Math.abs(touchX - currentThumbCenterX);
          const nextValue = getBrushSizeFromTouchX({
            touchX,
            width: sliderWidth,
            min,
            max,
          });
          const nextRatio = brushSizeToSliderRatio({ value: nextValue, min, max });

          if (distanceFromThumb > JUMP_ANIMATION_THRESHOLD) {
            touchModeRef.current = 'jump';
            Animated.spring(animatedRatio, {
              toValue: nextRatio,
              ...positionSpringConfig,
            }).start(({ finished }) => {
              if (finished && touchModeRef.current === 'jump') {
                touchModeRef.current = 'idle';
              }
            });
            commitValue(nextValue);
            return;
          }

          touchModeRef.current = 'drag';
          updateFromTouch(touchX);
        }}
        onResponderMove={(event) => {
          if (!isDragging) {
            setIsDragging(true);
          }

          if (touchModeRef.current !== 'drag') {
            touchModeRef.current = 'drag';
            animatedRatio.stopAnimation();
          }

          updateFromTouch(event.nativeEvent.locationX);
        }}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
        accessibilityRole="adjustable"
        accessibilityLabel="Brush size"
        accessibilityHint="Drag left or right to change emoji size"
        accessibilityActions={accessibilityActions}
        accessibilityValue={{
          min,
          max,
          now: displayValue,
          text: `${displayValue}`,
        }}
        onAccessibilityAction={(event) => {
          const actionName = event.nativeEvent.actionName;

          if (actionName === 'increment') {
            commitValue(displayValue + BUTTON_STEP);
          }

          if (actionName === 'decrement') {
            commitValue(displayValue - BUTTON_STEP);
          }
        }}
        style={styles.container}>
        <View
          testID="brush-size-shell"
          pointerEvents="none"
          style={[styles.sliderShell, { backgroundColor: shellColor }]}>
          <View style={[styles.track, { backgroundColor: trackColor }]} />
          <Animated.View
            testID="brush-size-fill"
            style={[
              styles.fill,
              {
                width: animatedFillWidth,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>
        <Animated.View
          testID="brush-size-thumb"
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              top: animatedThumbTop,
              left: animatedThumbLeft,
              width: animatedThumbSize,
              height: animatedThumbSize,
              backgroundColor: surfaceColor,
              borderColor: accentColor,
            },
          ]}>
          <AnimatedText
            testID="brush-size-thumb-label"
            style={[
              styles.thumbLabel,
              {
                color: labelColor,
                fontSize: animatedThumbFontSize,
                lineHeight: animatedThumbFontSize,
              },
            ]}>
            {displayValue}
          </AnimatedText>
        </Animated.View>
      </View>
      <Pressable
        testID="brush-size-increment"
        onPress={() => {
          commitValue(liveValueRef.current + BUTTON_STEP);
        }}
        accessibilityRole="button"
        accessibilityLabel="Increase brush size"
        style={[styles.endpointButton, { backgroundColor: shellColor }]}>
        <Text style={[styles.endpointLabel, { color: labelColor }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  endpointButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  endpointLabel: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  container: {
    flex: 1,
    height: SLIDER_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'visible',
  },
  sliderShell: {
    position: 'absolute',
    inset: 0,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: TRACK_HORIZONTAL_INSET,
    right: TRACK_HORIZONTAL_INSET,
    height: TRACK_HEIGHT,
    borderRadius: 999,
    opacity: 0.95,
  },
  fill: {
    position: 'absolute',
    left: TRACK_HORIZONTAL_INSET,
    height: TRACK_HEIGHT,
    borderRadius: 999,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbLabel: {
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '700',
  },
});
