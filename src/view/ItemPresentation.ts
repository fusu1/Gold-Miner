import type { GameSnapshot, MineItem, Point } from '../game/types';
import { ITEM_ASSETS } from './ClassicAssets';

/** The longest visible side matches the rule diameter; padding is already removed by texture frames. */
export function getItemDisplaySize(item: MineItem): { readonly width: number; readonly height: number } {
  const bounds = ITEM_ASSETS[item.kind].bounds;
  const width = bounds ? bounds[2] - bounds[0] : 1;
  const height = bounds ? bounds[3] - bounds[1] : 1;
  const scale = item.radius * 2 / Math.max(width, height);
  return { width: width * scale, height: height * scale };
}

/**
 * A rule collision uses circles, while a sprite may be flatter. Move only its carried presentation
 * closer to the hook so the visible edge is caught. Effects use this same position. Returns null
 * when there is no valid cargo; neither the rule item nor its saved collision offset is modified.
 */
export function getCargoDisplayPosition(game: GameSnapshot): Point | null {
  const { carriedItemId, grabOffset, position } = game.hook;
  const item = game.items.find((candidate) => candidate.id === carriedItemId);
  if (!item || !grabOffset) return null;
  const length = Math.hypot(grabOffset.x, grabOffset.y);
  if (length === 0) return { x: position.x, y: position.y };
  const x = grabOffset.x / length;
  const y = grabOffset.y / length;
  const size = getItemDisplaySize(item);
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const visibleRadius = 1 / Math.sqrt(x * x / (halfWidth * halfWidth) + y * y / (halfHeight * halfHeight));
  const distance = Math.max(0, visibleRadius - 2);
  return { x: position.x + x * distance, y: position.y + y * distance };
}
