import { Platform } from 'react-native';

type PlatformScaleArgs = {
  os: string;
  isPad: boolean;
};

export function getControlScaleForPlatform({ os, isPad }: PlatformScaleArgs) {
  return os === 'ios' && isPad ? 1.5 : 1;
}

const runtimeIsPad = 'isPad' in Platform ? Boolean((Platform as { isPad?: boolean }).isPad) : false;
export const CONTROL_SCALE = getControlScaleForPlatform({
  os: Platform.OS,
  isPad: runtimeIsPad,
});

export function scaleControlSize(size: number) {
  return size * CONTROL_SCALE;
}
