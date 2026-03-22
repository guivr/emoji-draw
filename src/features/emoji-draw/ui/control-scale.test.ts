import { getControlScaleForPlatform } from '@/features/emoji-draw/ui/control-scale';

describe('control-scale', () => {
  test('returns 1.5 for iPad', () => {
    expect(getControlScaleForPlatform({ os: 'ios', isPad: true })).toBe(1.5);
  });

  test('returns 1 for non-iPad devices', () => {
    expect(getControlScaleForPlatform({ os: 'ios', isPad: false })).toBe(1);
    expect(getControlScaleForPlatform({ os: 'android', isPad: true })).toBe(1);
    expect(getControlScaleForPlatform({ os: 'web', isPad: true })).toBe(1);
  });
});
