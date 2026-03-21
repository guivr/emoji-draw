export type CanvasPoint = {
  x: number;
  y: number;
};

function distance(from: CanvasPoint, to: CanvasPoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  return Math.hypot(dx, dy);
}

function getStampSpacing(brushSize: number, spacingRatio: number) {
  return Math.max(1, brushSize * spacingRatio);
}

export function clampBrushSize(size: number, min: number, max: number) {
  return Math.min(Math.max(size, min), max);
}

export function shouldStampFromDistance(
  previousPoint: CanvasPoint,
  nextPoint: CanvasPoint,
  brushSize: number,
  spacingRatio: number
) {
  return distance(previousPoint, nextPoint) >= getStampSpacing(brushSize, spacingRatio);
}

export function createInterpolatedStamps(
  from: CanvasPoint,
  to: CanvasPoint,
  brushSize: number,
  spacingRatio: number
) {
  const totalDistance = distance(from, to);
  if (totalDistance <= 0) {
    return [] as CanvasPoint[];
  }

  const spacing = getStampSpacing(brushSize, spacingRatio);
  const directionX = (to.x - from.x) / totalDistance;
  const directionY = (to.y - from.y) / totalDistance;

  const points: CanvasPoint[] = [];
  for (let currentDistance = spacing; currentDistance <= totalDistance; currentDistance += spacing) {
    points.push({
      x: from.x + directionX * currentDistance,
      y: from.y + directionY * currentDistance,
    });
  }

  const lastPoint = points[points.length - 1];
  if (!lastPoint || lastPoint.x !== to.x || lastPoint.y !== to.y) {
    points.push({ x: to.x, y: to.y });
  }

  return points;
}
