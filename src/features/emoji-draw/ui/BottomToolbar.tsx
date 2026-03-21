import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import {
  playBombSizzleSound,
  playEmojiPlacementSound,
} from '@/features/emoji-draw/model/emoji-sound-player';
import { BOMB_EMOJI, BRUSH_SIZE_LIMITS } from '@/features/emoji-draw/model/types';
import { BrushSizePuck } from '@/features/emoji-draw/ui/BrushSizePuck';
import { getEmojiStripFadeState } from '@/features/emoji-draw/ui/emoji-strip-fade';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BottomToolbarProps = {
  brushSize: number;
  selectedEmoji: string;
  recentEmojis: readonly string[];
  onBrushSizeChange: (size: number) => void;
  onSelectEmoji: (emoji: string) => void;
};

type EmojiOptionButtonProps = {
  emoji: string;
  isSelected: boolean;
  replayToken: number;
  borderColor: string;
  backgroundColor: string;
  onPress: () => void;
};

const BUTTON_SIZE = 44;
const BUTTON_SIZE_SELECTED = 60;
const TEXT_SIZE = 22;
const TEXT_SIZE_SELECTED = 35;
const SELECTED_BORDER_COLOR = '#1D72F2';
const EDGE_FADE_WIDTH = 24;
const AnimatedText = Animated.createAnimatedComponent(Text);
const SIZE_TRANSITION_DURATION_MS = 150;

function EmojiOptionButton({
  emoji,
  isSelected,
  replayToken,
  borderColor,
  backgroundColor,
  onPress,
}: EmojiOptionButtonProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const animatedWidth = useRef(new Animated.Value(isSelected ? BUTTON_SIZE_SELECTED : BUTTON_SIZE)).current;
  const animatedHeight = useRef(new Animated.Value(isSelected ? BUTTON_SIZE_SELECTED : BUTTON_SIZE)).current;
  const animatedFontSize = useRef(new Animated.Value(isSelected ? TEXT_SIZE_SELECTED : TEXT_SIZE)).current;
  const wasSelected = useRef(isSelected);
  const lastReplayToken = useRef(replayToken);

  const runCoinFlip = () => {
    rotation.setValue(0);
    Animated.timing(rotation, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedWidth, {
        toValue: isSelected ? BUTTON_SIZE_SELECTED : BUTTON_SIZE,
        duration: SIZE_TRANSITION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedHeight, {
        toValue: isSelected ? BUTTON_SIZE_SELECTED : BUTTON_SIZE,
        duration: SIZE_TRANSITION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animatedFontSize, {
        toValue: isSelected ? TEXT_SIZE_SELECTED : TEXT_SIZE,
        duration: SIZE_TRANSITION_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    if (!wasSelected.current && isSelected) {
      runCoinFlip();
    }

    if (isSelected && replayToken !== lastReplayToken.current) {
      runCoinFlip();
    }

    wasSelected.current = isSelected;
    lastReplayToken.current = replayToken;
  }, [animatedFontSize, animatedHeight, animatedWidth, isSelected, replayToken, rotation]);

  const rotateY = rotation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '360deg'],
  });

  return (
    <View style={styles.emojiSlot}>
      <Animated.View
        style={{
          width: animatedWidth,
          height: animatedHeight,
        }}>
        <Pressable
          onPress={onPress}
          style={[
            styles.emojiButton,
            {
              borderColor: isSelected ? SELECTED_BORDER_COLOR : borderColor,
              backgroundColor,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Select ${emoji}`}>
          <Animated.View style={{ transform: [{ perspective: 900 }, { rotateY }] }}>
            <AnimatedText
              style={[
                styles.emojiText,
                { fontSize: animatedFontSize },
              ]}>
              {emoji}
            </AnimatedText>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function BottomToolbar({
  brushSize,
  selectedEmoji,
  recentEmojis,
  onBrushSizeChange,
  onSelectEmoji,
}: BottomToolbarProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const [stripLayoutWidth, setStripLayoutWidth] = useState(0);
  const [stripContentWidth, setStripContentWidth] = useState(0);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [selectedEmojiReplayToken, setSelectedEmojiReplayToken] = useState(0);

  const updateFadeState = (offsetX: number, layoutWidth = stripLayoutWidth, contentWidth = stripContentWidth) => {
    const nextFadeState = getEmojiStripFadeState({
      offsetX,
      layoutWidth,
      contentWidth,
    });

    setShowLeftFade(nextFadeState.showLeftFade);
    setShowRightFade(nextFadeState.showRightFade);
  };

  return (
    <View testID="bottom-toolbar-root" style={styles.root}>
      <View testID="bottom-toolbar-emoji-section" style={styles.emojiRow}>
        <Pressable
          style={[
            styles.searchButton,
            { borderColor: colors.backgroundSelected, backgroundColor: colors.backgroundElement },
          ]}
          accessibilityState={{ disabled: true }}
          accessibilityLabel="Search coming soon">
          <Text style={styles.searchIcon}>🔎</Text>
        </Pressable>

        <View style={styles.emojiStripViewport}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiStrip}
            onLayout={(event) => {
              const nextLayoutWidth = event.nativeEvent.layout.width;
              setStripLayoutWidth(nextLayoutWidth);
              updateFadeState(0, nextLayoutWidth, stripContentWidth);
            }}
            onContentSizeChange={(width) => {
              setStripContentWidth(width);
              updateFadeState(0, stripLayoutWidth, width);
            }}
            onScroll={(event) => {
              updateFadeState(event.nativeEvent.contentOffset.x);
            }}
            scrollEventThrottle={16}>
            {recentEmojis.map((emoji) => {
              return (
                <EmojiOptionButton
                  key={emoji}
                  emoji={emoji}
                  isSelected={selectedEmoji === emoji}
                  replayToken={selectedEmoji === emoji ? selectedEmojiReplayToken : 0}
                  borderColor={colors.backgroundSelected}
                  backgroundColor={colors.backgroundElement}
                  onPress={() => {
                    if (emoji === BOMB_EMOJI) {
                      playBombSizzleSound();
                    } else {
                      playEmojiPlacementSound(emoji);
                    }

                    if (selectedEmoji === emoji) {
                      setSelectedEmojiReplayToken((current) => current + 1);
                      return;
                    }

                    void Haptics.selectionAsync();
                    onSelectEmoji(emoji);
                  }}
                />
              );
            })}
          </ScrollView>

          {showLeftFade ? (
            <LinearGradient
              pointerEvents="none"
              colors={[colors.background, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.edgeFade, styles.leftFade]}
            />
          ) : null}

          {showRightFade ? (
            <LinearGradient
              pointerEvents="none"
              colors={['transparent', colors.background]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.edgeFade, styles.rightFade]}
            />
          ) : null}
        </View>
      </View>

      <View testID="bottom-toolbar-slider-row" style={styles.sliderRow}>
        <BrushSizePuck
          value={brushSize}
          min={BRUSH_SIZE_LIMITS.min}
          max={BRUSH_SIZE_LIMITS.max}
          onChange={onBrushSizeChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'column',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.two,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sliderRow: {
    width: '100%',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 19,
  },
  emojiStripViewport: {
    flex: 1,
    position: 'relative',
  },
  emojiStrip: {
    padding: Spacing.one,
    alignItems: 'center',
  },
  edgeFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: EDGE_FADE_WIDTH,
  },
  leftFade: {
    left: 0,
  },
  rightFade: {
    right: 0,
  },
  emojiSlot: {
    width: BUTTON_SIZE_SELECTED,
    height: BUTTON_SIZE_SELECTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButton: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: TEXT_SIZE,
  },
});
