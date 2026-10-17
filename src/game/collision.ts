import type { MineItem, Point, Rect } from './types';

export interface ItemHit {
  readonly item: MineItem;
  readonly point: Point;
  /** Fraction of the travelled segment, from 0 to 1. */
  readonly t: number;
}

/** Sweep the hook tip over a segment, so small targets cannot be skipped. */
export function findFirstItemHit(
  start: Point,
  end: Point,
  items: readonly MineItem[],
  hookRadius: number,
): ItemHit | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const a = dx * dx + dy * dy;
  let nearest: ItemHit | null = null;

  for (const item of items) {
    const ox = start.x - item.x;
    const oy = start.y - item.y;
    const radius = item.radius + hookRadius;
    const c = ox * ox + oy * oy - radius * radius;
    let t: number;

    if (c <= 0) {
      t = 0;
    } else {
      if (a === 0) continue;
      const b = 2 * (ox * dx + oy * dy);
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) continue;
      t = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (t < 0 || t > 1) continue;
    }

    if (nearest === null || t < nearest.t) {
      nearest = { item, t, point: { x: start.x + dx * t, y: start.y + dy * t } };
    }
  }

  return nearest;
}

/** Distance along a ray to its first exit from the rectangular play area. */
export function rayDistanceToBounds(origin: Point, direction: Point, bounds: Rect): number {
  const xDistance = direction.x > 0
    ? (bounds.right - origin.x) / direction.x
    : direction.x < 0 ? (bounds.left - origin.x) / direction.x : Infinity;
  const yDistance = direction.y > 0
    ? (bounds.bottom - origin.y) / direction.y
    : direction.y < 0 ? (bounds.top - origin.y) / direction.y : Infinity;
  return Math.max(0, Math.min(xDistance, yDistance));
}
