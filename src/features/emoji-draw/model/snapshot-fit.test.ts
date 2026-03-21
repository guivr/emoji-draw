import {
  getRasterBakeSpec,
  getSnapshotDestinationSize,
  getSnapshotScale,
  getSupersampledPixelSize,
} from './snapshot-fit';

describe('snapshot fit', () => {
  test('scales down pixel-density snapshots to view-space width', () => {
    expect(getSnapshotScale(1290, 430)).toBeCloseTo(1 / 3);
  });

  test('returns identity scale when dimensions already match', () => {
    expect(getSnapshotScale(430, 430)).toBe(1);
  });

  test('guards invalid dimensions with identity scale', () => {
    expect(getSnapshotScale(0, 430)).toBe(1);
    expect(getSnapshotScale(1290, 0)).toBe(1);
  });

  test('maps snapshot pixels to logical size using pixel ratio', () => {
    expect(getSnapshotDestinationSize(1290, 900, 430, 300, 3)).toEqual({
      width: 430,
      height: 300,
    });
  });

  test('falls back to pixel-ratio size when view is meaningfully different', () => {
    expect(getSnapshotDestinationSize(1290, 900, 420, 300, 3)).toEqual({
      width: 430,
      height: 300,
    });
  });

  test('returns 2x supersampled pixel dimensions', () => {
    expect(getSupersampledPixelSize(1290, 900, 2)).toEqual({
      width: 2580,
      height: 1800,
    });
  });

  test('builds high-DPI raster bake dimensions from pixel ratio', () => {
    expect(getRasterBakeSpec(430, 300, 3)).toEqual({
      rasterScale: 3,
      pixelWidth: 1290,
      pixelHeight: 900,
    });
  });

  test('clamps raster scale to avoid excessive offscreen size', () => {
    expect(getRasterBakeSpec(430, 300, 4, 3)).toEqual({
      rasterScale: 3,
      pixelWidth: 1290,
      pixelHeight: 900,
    });
  });
});
