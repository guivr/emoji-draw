import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { EmojiDrawScreen } from '@/features/emoji-draw/ui/EmojiDrawScreen';

jest.mock('@/features/emoji-draw/model/useEmojiCanvas', () => ({
  useEmojiCanvas: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    light: {
      background: '#FFFFFF',
      backgroundElement: '#F0F0F3',
      text: '#000000',
    },
    dark: {
      background: '#000000',
      backgroundElement: '#212225',
      text: '#FFFFFF',
    },
  },
  Spacing: {
    two: 8,
    three: 16,
  },
}));

jest.mock('@/features/emoji-draw/ui/EmojiCanvas', () => ({
  EmojiCanvas: () => {
    const ReactNative = require('react-native');
    return <ReactNative.View testID="emoji-canvas" />;
  },
}));

jest.mock('@/features/emoji-draw/ui/BottomToolbar', () => ({
  BottomToolbar: () => {
    const ReactNative = require('react-native');
    return <ReactNative.View testID="bottom-toolbar" />;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: () => null,
}));

jest.mock('@/features/emoji-draw/model/emoji-sound-player', () => ({
  playSaveSound: jest.fn(),
}));

const mockedUseEmojiCanvas = jest.requireMock('@/features/emoji-draw/model/useEmojiCanvas')
  .useEmojiCanvas as jest.Mock;
const mockedPlaySaveSound = jest.requireMock('@/features/emoji-draw/model/emoji-sound-player')
  .playSaveSound as jest.Mock;

function buildCanvasState(overrides: Record<string, unknown> = {}) {
  return {
    brushSize: 24,
    selectedEmoji: '🙂',
    activeStamps: [],
    armedBombs: [],
    activeBlastEffects: [],
    activeShockwaves: [],
    activeSwirls: [],
    activeTruckMove: null,
    bombAnimationTick: 0,
    committedEmojiPicture: null,
    recentEmojis: ['🙂', '🔥'],
    setSelectedEmoji: jest.fn(),
    updateBrushSize: jest.fn(),
    beginStroke: jest.fn(),
    continueStroke: jest.fn(),
    endStroke: jest.fn(),
    clearCanvas: jest.fn(),
    saveDrawing: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    canUndo: true,
    canRedo: false,
    ...overrides,
  };
}

describe('EmojiDrawScreen', () => {
  beforeEach(() => {
    mockedUseEmojiCanvas.mockReturnValue(buildCanvasState());
    mockedPlaySaveSound.mockClear();
  });

  it('renders undo and redo icon buttons in the top bar', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EmojiDrawScreen />);
    });

    expect(tree.root.findByProps({ accessibilityLabel: 'Undo' })).toBeDefined();
    expect(tree.root.findByProps({ accessibilityLabel: 'Redo' })).toBeDefined();
    expect(tree.root.findByProps({ accessibilityLabel: 'Save drawing' })).toBeDefined();
  });

  it('calls saveDrawing when pressing the save button', () => {
    const saveDrawing = jest.fn();
    mockedUseEmojiCanvas.mockReturnValue(
      buildCanvasState({
        saveDrawing,
      })
    );

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EmojiDrawScreen />);
    });

    const saveButton = tree.root.findByProps({ accessibilityLabel: 'Save drawing' });
    act(() => {
      saveButton.props.onPress();
    });

    expect(saveDrawing).toHaveBeenCalledTimes(1);
    expect(mockedPlaySaveSound).toHaveBeenCalledTimes(1);
  });

  it('shows a screenshot-style flash effect when pressing save', async () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EmojiDrawScreen />);
    });

    const saveButton = tree.root.findByProps({ accessibilityLabel: 'Save drawing' });
    await act(async () => {
      saveButton.props.onPress();
    });

    const canvasWrap = tree.root.findByProps({ testID: 'canvas-wrap' });
    expect(canvasWrap.findByProps({ testID: 'save-flash-overlay' })).toBeDefined();
  });

  it('disables undo and redo buttons when no history is available', () => {
    mockedUseEmojiCanvas.mockReturnValue(
      buildCanvasState({
        canUndo: false,
        canRedo: false,
      })
    );

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EmojiDrawScreen />);
    });

    const undoButton = tree.root.findByProps({ accessibilityLabel: 'Undo' });
    const redoButton = tree.root.findByProps({ accessibilityLabel: 'Redo' });

    expect(undoButton.props.disabled).toBe(true);
    expect(redoButton.props.disabled).toBe(true);
  });
});
