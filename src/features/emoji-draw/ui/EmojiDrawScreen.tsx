import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useEmojiCanvas } from '@/features/emoji-draw/model/useEmojiCanvas';
import { BottomToolbar } from '@/features/emoji-draw/ui/BottomToolbar';
import { EmojiCanvas } from '@/features/emoji-draw/ui/EmojiCanvas';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function EmojiDrawScreen() {
  const {
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
    recentEmojis,
    setSelectedEmoji,
    updateBrushSize,
    beginStroke,
    continueStroke,
    endStroke,
    clearCanvas,
  } = useEmojiCanvas();

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable style={[
          styles.topButton,
          { backgroundColor: colors.backgroundElement }
        ]} onPress={clearCanvas} accessibilityRole="button">
          <Text style={[styles.topButtonText, { color: colors.text }]}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.canvasWrap}>
        <EmojiCanvas
          activeStamps={activeStamps}
          armedBombs={armedBombs}
          activeBlastEffects={activeBlastEffects}
          activeShockwaves={activeShockwaves}
          activeSwirls={activeSwirls}
          activeTruckMove={activeTruckMove}
          bombAnimationTick={bombAnimationTick}
          committedEmojiPicture={committedEmojiPicture}
          onStrokeStart={beginStroke}
          onStrokeMove={continueStroke}
          onStrokeEnd={endStroke}
        />
      </View>

      <BottomToolbar
        brushSize={brushSize}
        selectedEmoji={selectedEmoji}
        recentEmojis={recentEmojis}
        onBrushSizeChange={updateBrushSize}
        onSelectEmoji={setSelectedEmoji}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  topButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  topButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  canvasWrap: {
    flex: 1,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
});
