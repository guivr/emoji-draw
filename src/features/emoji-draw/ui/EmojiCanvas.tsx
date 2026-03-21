import type { SkPicture } from '@shopify/react-native-skia';
import {
  BlurMask,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Paint,
  Picture,
  RuntimeShader,
  Skia,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { getBombShineStrength } from '@/features/emoji-draw/model/emoji-bomb';
import type { CanvasPoint } from '@/features/emoji-draw/model/emoji-canvas-math';
import { getEmojiFont } from '@/features/emoji-draw/model/emoji-font';
import { getSwirlVisualProgress } from '@/features/emoji-draw/model/emoji-swirl';
import type {
  AnimatedBlastEffect,
  CanvasBounds,
  EmojiStamp,
  ShockwaveEffect,
  SwirlEffect,
  TruckMoveEffect,
} from '@/features/emoji-draw/model/types';

const DISTORTION_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 center;
uniform float progress;
uniform float maxRadius;
uniform float phase;

half4 main(float2 xy) {
  float2 dir = xy - center;
  float dist = length(dir);
  float2 unit = dist > 0.001 ? dir / dist : float2(0.0, 0.0);

  float waveRadius = maxRadius * progress;
  float nearWave = exp(-pow((dist - waveRadius) / max(maxRadius * 0.12, 8.0), 2.0));
  float pulse = sin(dist * 0.08 - phase * 18.0);
  float fadeOut = 1.0 - progress;
  float strength = fadeOut * 18.0;
  float offset = pulse * nearWave * strength;

  float2 displaced = xy + unit * offset;
  return image.eval(displaced);
}
`);

const SWIRL_SHADER = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 center;
uniform float progress;
uniform float maxRadius;
uniform float spinTurns;

half4 main(float2 xy) {
  float2 offset = xy - center;
  float dist = length(offset);
  float radius = max(maxRadius, 1.0);
  float inside = clamp(1.0 - dist / radius, 0.0, 1.0);
  float envelope = smoothstep(0.0, 1.0, inside);
  float angle = spinTurns * 6.2831853 * progress * envelope * envelope;
  float s = sin(angle);
  float c = cos(angle);
  float2 rotated = float2(
    offset.x * c - offset.y * s,
    offset.x * s + offset.y * c
  );
  return image.eval(center + rotated);
}
`);

const CANVAS_BORDER_WIDTH = 1;

function makeBrightnessMatrix(strength: number): number[] {
  const b = 1 + strength * 0.7;
  const o = strength * 0.35;
  return [
    b, 0, 0, 0, o,
    0, b, 0, 0, o,
    0, 0, b, 0, o,
    0, 0, 0, 1, 0,
  ];
}

type EmojiCanvasProps = {
  activeStamps: EmojiStamp[];
  armedBombs: EmojiStamp[];
  activeBlastEffects: AnimatedBlastEffect[];
  activeShockwaves: ShockwaveEffect[];
  activeSwirls: SwirlEffect[];
  activeTruckMove: TruckMoveEffect | null;
  bombAnimationTick: number;
  committedEmojiPicture: SkPicture | null;
  onStrokeStart: (point: CanvasPoint, bounds: CanvasBounds) => void;
  onStrokeMove: (point: CanvasPoint, bounds: CanvasBounds) => void;
  onStrokeEnd: () => void;
};

export function EmojiCanvas({
  activeStamps,
  armedBombs,
  activeBlastEffects,
  activeShockwaves,
  activeSwirls,
  activeTruckMove,
  bombAnimationTick,
  committedEmojiPicture,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}: EmojiCanvasProps) {
  const [bounds, setBounds] = useState<CanvasBounds>({ width: 0, height: 0 });

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBounds({ width, height });
  };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          if (!bounds.width || !bounds.height) return;
          runOnJS(onStrokeStart)({ x: event.x, y: event.y }, bounds);
        })
        .onUpdate((event) => {
          if (!bounds.width || !bounds.height) return;
          runOnJS(onStrokeMove)({ x: event.x, y: event.y }, bounds);
        })
        .onFinalize(() => {
          runOnJS(onStrokeEnd)();
        }),
    [bounds, onStrokeEnd, onStrokeMove, onStrokeStart]
  );

  const hasDistortion = DISTORTION_SHADER && activeShockwaves.length > 0;
  const primaryWave = hasDistortion ? activeShockwaves[0] : null;
  const distortionUniforms = useMemo(() => {
    if (!primaryWave) return null;
    const elapsedMs = Math.max(0, bombAnimationTick - primaryWave.startedAtMs);
    const progress = Math.min(1, elapsedMs / primaryWave.durationMs);
    const eased = 1 - Math.pow(1 - progress, 2.5);
    return {
      center: [primaryWave.x, primaryWave.y],
      progress: eased,
      maxRadius: primaryWave.maxRadius,
      phase: eased * 1.4,
    };
  }, [primaryWave, bombAnimationTick]);

  const swirlUniformLayers = useMemo(
    () =>
      activeSwirls.map((swirl) => ({
        id: swirl.id,
        uniforms: {
          center: [swirl.x, swirl.y],
          progress: getSwirlVisualProgress(swirl, bombAnimationTick),
          maxRadius: swirl.maxRadius,
          spinTurns: swirl.spinTurns,
        },
      })),
    [activeSwirls, bombAnimationTick]
  );
  const hasSwirl = Boolean(SWIRL_SHADER && swirlUniformLayers.length > 0);
  const truckClipPath = useMemo(() => {
    if (!activeTruckMove) {
      return null;
    }
    const path = Skia.Path.Make();
    path.addCircle(activeTruckMove.x, activeTruckMove.y, activeTruckMove.radius);
    return path;
  }, [activeTruckMove]);

  const canvasContent = useMemo(
    () => (
      <>
        {committedEmojiPicture && <Picture picture={committedEmojiPicture} />}

        {activeBlastEffects.map((effect) => {
          const elapsedMs = Math.max(0, bombAnimationTick - effect.startedAtMs);
          const rawProgress = Math.min(1, elapsedMs / effect.durationMs);
          const ease = 1 - Math.pow(1 - rawProgress, 3);
          const offsetScale = 0.1 + ease * 0.9;
          const radiusScale = 0.2 + ease * 0.8;
          const opacityScale = 0.3 + ease * 0.7;

          return (
            <Group key={effect.id}>
              {effect.clouds.map((cloud, index) => {
                const blur = cloud.tone === 'core' ? 10 : cloud.tone === 'mist' ? 16 : 24;
                return (
                  <Group key={`${effect.id}:${index}`}>
                    <BlurMask blur={blur} style="normal" />
                    <Circle
                      cx={effect.x + cloud.xOffset * offsetScale}
                      cy={effect.y + cloud.yOffset * offsetScale}
                      r={Math.max(4, cloud.radius * radiusScale)}
                      color="white"
                      opacity={Math.min(1, cloud.opacity * opacityScale)}
                    />
                  </Group>
                );
              })}
            </Group>
          );
        })}

        {activeStamps.map((stamp) => (
          <SkiaText
            key={stamp.id}
            text={stamp.emoji}
            x={stamp.x - stamp.size / 2}
            y={stamp.y + stamp.size * 0.3}
            font={getEmojiFont(stamp.size)}
          />
        ))}

        {armedBombs.map((stamp) => {
          const shineStrength = getBombShineStrength(stamp, bombAnimationTick);
          const brightnessMatrix = makeBrightnessMatrix(shineStrength);

          return (
            <Group key={stamp.id}>
              <ColorMatrix matrix={brightnessMatrix} />
              <SkiaText
                text={stamp.emoji}
                x={stamp.x - stamp.size / 2}
                y={stamp.y + stamp.size * 0.3}
                font={getEmojiFont(stamp.size)}
              />
            </Group>
          );
        })}

        {activeTruckMove && committedEmojiPicture && truckClipPath ? (
          <>
            <Circle
              cx={activeTruckMove.x}
              cy={activeTruckMove.y}
              r={activeTruckMove.radius}
              color="white"
            />
            <Group
              transform={[
                { translateX: activeTruckMove.deltaX },
                { translateY: activeTruckMove.deltaY },
              ]}>
              <Group clip={truckClipPath}>
                <Picture picture={committedEmojiPicture} />
              </Group>
            </Group>
          </>
        ) : null}
      </>
    ),
    [
      activeBlastEffects,
      activeStamps,
      activeTruckMove,
      armedBombs,
      bombAnimationTick,
      committedEmojiPicture,
      truckClipPath,
    ]
  );

  const layeredContent = useMemo(() => {
    let content: React.ReactNode = canvasContent;

    if (hasDistortion && distortionUniforms) {
      content = (
        <Group
          layer={
            <Paint>
              <RuntimeShader source={DISTORTION_SHADER!} uniforms={distortionUniforms} />
            </Paint>
          }>
          {content}
        </Group>
      );
    }

    if (hasSwirl) {
      content = swirlUniformLayers.reduce<React.ReactNode>((accumulated, layer) => {
        return (
          <Group
            key={layer.id}
            layer={
              <Paint>
                <RuntimeShader source={SWIRL_SHADER!} uniforms={layer.uniforms} />
              </Paint>
            }>
            {accumulated}
          </Group>
        );
      }, content);
    }

    return content;
  }, [
    canvasContent,
    distortionUniforms,
    hasDistortion,
    hasSwirl,
    swirlUniformLayers,
  ]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        <View style={styles.canvasViewport} onLayout={onCanvasLayout}>
          <Canvas style={styles.canvas}>
            {layeredContent}
          </Canvas>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: CANVAS_BORDER_WIDTH,
    borderColor: '#ECEEF2',
  },
  canvas: {
    flex: 1,
  },
  canvasViewport: {
    flex: 1,
  },
});
