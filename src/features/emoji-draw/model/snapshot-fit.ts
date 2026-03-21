export function getSnapshotScale(imageDimension: number, viewDimension: number) {
  if (imageDimension <= 0 || viewDimension <= 0) {
    return 1;
  }

  return viewDimension / imageDimension;
}

export function getSnapshotDestinationSize(
  imageWidth: number,
  imageHeight: number,
  viewWidth: number,
  viewHeight: number,
  pixelRatio: number
) {
  if (
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    pixelRatio <= 0
  ) {
    return {
      width: viewWidth,
      height: viewHeight,
    };
  }

  const fromPixelRatioWidth = imageWidth / pixelRatio;
  const fromPixelRatioHeight = imageHeight / pixelRatio;

  // If tiny drift exists (border/layout rounding), trust current view bounds.
  const width = Math.abs(fromPixelRatioWidth - viewWidth) <= 2
    ? viewWidth
    : fromPixelRatioWidth;
  const height = Math.abs(fromPixelRatioHeight - viewHeight) <= 2
    ? viewHeight
    : fromPixelRatioHeight;

  return { width, height };
}

export function getSupersampledPixelSize(
  imageWidth: number,
  imageHeight: number,
  supersampleFactor = 2
) {
  if (imageWidth <= 0 || imageHeight <= 0 || supersampleFactor <= 0) {
    return {
      width: Math.max(1, Math.round(imageWidth)),
      height: Math.max(1, Math.round(imageHeight)),
    };
  }

  return {
    width: Math.max(1, Math.round(imageWidth * supersampleFactor)),
    height: Math.max(1, Math.round(imageHeight * supersampleFactor)),
  };
}

export function getRasterBakeSpec(
  logicalWidth: number,
  logicalHeight: number,
  pixelRatio: number,
  maxRasterScale = 3
) {
  const safeLogicalWidth = Math.max(1, Math.round(logicalWidth));
  const safeLogicalHeight = Math.max(1, Math.round(logicalHeight));
  const safePixelRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const rasterScale = Math.min(maxRasterScale, Math.max(1, safePixelRatio));

  return {
    rasterScale,
    pixelWidth: Math.max(1, Math.round(safeLogicalWidth * rasterScale)),
    pixelHeight: Math.max(1, Math.round(safeLogicalHeight * rasterScale)),
  };
}
