import { matchFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

const FONT_FAMILY = Platform.select({
  ios: 'Apple Color Emoji',
  android: 'Noto Color Emoji',
  default: 'System',
});

const fontCache = new Map<number, ReturnType<typeof matchFont>>();

export function getEmojiFont(size: number) {
  const rounded = Math.max(10, Math.round(size));
  const cached = fontCache.get(rounded);
  if (cached) return cached;

  const font = matchFont({ fontSize: rounded, fontFamily: FONT_FAMILY! });
  fontCache.set(rounded, font);
  return font;
}
