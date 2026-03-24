import React from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { useEmojiCanvas } from '@/features/emoji-draw/model/useEmojiCanvas';
import {
  getSoundEffectsEnabled,
  playSaveSound,
  setSoundEffectsEnabled,
} from '@/features/emoji-draw/model/emoji-sound-player';
import { BottomToolbar } from '@/features/emoji-draw/ui/BottomToolbar';
import { CONTROL_SCALE, scaleControlSize } from '@/features/emoji-draw/ui/control-scale';
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
    saveDrawing,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEmojiCanvas();

  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const [soundEffectsEnabled, setSoundEffectsEnabledState] = React.useState(getSoundEffectsEnabled);
  const [hasSaveFlashed, setHasSaveFlashed] = React.useState(false);
  const saveFlashOpacity = React.useRef(new Animated.Value(0)).current;

  const triggerSaveFlash = React.useCallback(() => {
    setHasSaveFlashed(true);
    saveFlashOpacity.stopAnimation();
    saveFlashOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(saveFlashOpacity, {
        toValue: 0.95,
        duration: 75,
        useNativeDriver: true,
      }),
      Animated.timing(saveFlashOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [saveFlashOpacity]);

  const onSavePress = React.useCallback(async () => {
    playSaveSound();
    triggerSaveFlash();
    const saved = await saveDrawing();
    if (saved) {
      Alert.alert('Saved', 'Drawing saved to your photo library.');
      return;
    }

    Alert.alert('Unable to save', 'We could not save this drawing right now.');
  }, [saveDrawing, triggerSaveFlash]);

  const onToggleSoundEffects = React.useCallback(() => {
    const nextEnabled = !soundEffectsEnabled;
    setSoundEffectsEnabled(nextEnabled);
    setSoundEffectsEnabledState(nextEnabled);
  }, [soundEffectsEnabled]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable
            style={[
              styles.topIconButton,
              { backgroundColor: colors.backgroundElement },
            ]}
            onPress={onToggleSoundEffects}
            accessibilityRole="button"
            accessibilityLabel={
              soundEffectsEnabled ? 'Turn sound effects off' : 'Turn sound effects on'
            }>
            <FontAwesome6
              name={soundEffectsEnabled ? 'volume-high' : 'volume-xmark'}
              size={scaleControlSize(17)}
              color={colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.topBarRight}>
          <Pressable
            style={[
              styles.topIconButton,
              { backgroundColor: colors.backgroundElement },
              !canUndo && styles.topButtonDisabled,
            ]}
            onPress={undo}
            disabled={!canUndo}
            accessibilityRole="button"
            accessibilityLabel="Undo">
            <FontAwesome name="undo" size={scaleControlSize(17)} color={colors.text} />
          </Pressable>
          <Pressable
            style={[
              styles.topIconButton,
              { backgroundColor: colors.backgroundElement },
              !canRedo && styles.topButtonDisabled,
            ]}
            onPress={redo}
            disabled={!canRedo}
            accessibilityRole="button"
            accessibilityLabel="Redo">
            <FontAwesome name="repeat" size={scaleControlSize(17)} color={colors.text} />
          </Pressable>
          <Pressable style={[
            styles.topButton,
            { backgroundColor: colors.backgroundElement }
          ]} onPress={onSavePress} accessibilityRole="button" accessibilityLabel="Save drawing">
            <Text style={[styles.topButtonText, { color: colors.text }]}>Save</Text>
          </Pressable>
          <Pressable style={[
            styles.topButton,
            { backgroundColor: colors.backgroundElement }
          ]} onPress={clearCanvas} accessibilityRole="button">
            <Text style={[styles.topButtonText, { color: colors.text }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View testID="canvas-wrap" style={styles.canvasWrap}>
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
        {hasSaveFlashed ? (
          <Animated.View
            testID="save-flash-overlay"
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, styles.saveFlashOverlay, { opacity: saveFlashOpacity }]}
          />
        ) : null}
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
    minHeight: scaleControlSize(44),
    paddingHorizontal: Spacing.three,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  topBarLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  topBarRight: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  topIconButton: {
    width: scaleControlSize(40),
    height: scaleControlSize(40),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButton: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three * CONTROL_SCALE,
    paddingVertical: scaleControlSize(10),
  },
  topButtonDisabled: {
    opacity: 0.45,
  },
  topButtonText: {
    fontSize: scaleControlSize(14),
    fontWeight: '600',
  },
  canvasWrap: {
    flex: 1,
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  saveFlashOverlay: {
    backgroundColor: '#FFFFFF',
  },
});
