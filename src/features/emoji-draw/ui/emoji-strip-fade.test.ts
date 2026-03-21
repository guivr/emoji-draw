import { getEmojiStripFadeState } from '@/features/emoji-draw/ui/emoji-strip-fade';

describe('getEmojiStripFadeState', () => {
  it('shows only the right fade at the start of an overflowing strip', () => {
    expect(
      getEmojiStripFadeState({
        contentWidth: 400,
        layoutWidth: 240,
        offsetX: 0,
      })
    ).toEqual({
      showLeftFade: false,
      showRightFade: true,
    });
  });

  it('shows both fades in the middle of an overflowing strip', () => {
    expect(
      getEmojiStripFadeState({
        contentWidth: 400,
        layoutWidth: 240,
        offsetX: 80,
      })
    ).toEqual({
      showLeftFade: true,
      showRightFade: true,
    });
  });

  it('shows only the left fade at the end of an overflowing strip', () => {
    expect(
      getEmojiStripFadeState({
        contentWidth: 400,
        layoutWidth: 240,
        offsetX: 160,
      })
    ).toEqual({
      showLeftFade: true,
      showRightFade: false,
    });
  });

  it('hides both fades when the strip does not overflow', () => {
    expect(
      getEmojiStripFadeState({
        contentWidth: 220,
        layoutWidth: 240,
        offsetX: 0,
      })
    ).toEqual({
      showLeftFade: false,
      showRightFade: false,
    });
  });
});
