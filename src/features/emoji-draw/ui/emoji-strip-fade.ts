type EmojiStripFadeStateInput = {
  contentWidth: number;
  layoutWidth: number;
  offsetX: number;
};

const EDGE_THRESHOLD = 4;

export function getEmojiStripFadeState({
  contentWidth,
  layoutWidth,
  offsetX,
}: EmojiStripFadeStateInput) {
  const maxOffset = Math.max(contentWidth - layoutWidth, 0);
  const isOverflowing = maxOffset > EDGE_THRESHOLD;

  if (!isOverflowing) {
    return {
      showLeftFade: false,
      showRightFade: false,
    };
  }

  return {
    showLeftFade: offsetX > EDGE_THRESHOLD,
    showRightFade: offsetX < maxOffset - EDGE_THRESHOLD,
  };
}
