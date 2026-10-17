import type { ItemKind, MineItem, Point } from '../game/types';
import { createItem } from './items';

const SLOTS: readonly Point[] = [
  { x: 190, y: 265 }, { x: 390, y: 250 }, { x: 610, y: 260 }, { x: 790, y: 290 },
  { x: 280, y: 390 }, { x: 500, y: 380 }, { x: 700, y: 420 }, { x: 130, y: 545 },
  { x: 360, y: 550 }, { x: 570, y: 560 }, { x: 820, y: 550 }, { x: 100, y: 400 },
];

/** Deterministic waves rotate targets through well-separated slots, then add depth and rocks. */
export function createEndlessWave(round: number): readonly MineItem[] {
  const wave = Number.isFinite(round) ? Math.max(1, Math.floor(round)) : 1;
  const count = Math.min(12, 8 + Math.floor((wave - 1) / 2));
  const stoneCount = Math.min(4, 1 + Math.floor((wave - 1) / 2));
  const depth = Math.min(36, (wave - 1) * 4);
  const rewards: readonly ItemKind[] = wave >= 5
    ? ['gold-small', 'diamond', 'gold-large', 'gold-small', 'gold-medium']
    : ['gold-medium', 'gold-small', 'gold-large', 'gold-medium', 'diamond'];

  return Array.from({ length: count }, (_, index) => {
    const slot = SLOTS[(index + wave - 1) % SLOTS.length];
    // Spread rocks over the active slots rather than hiding every reward in one region.
    const isStone = Math.floor((index + 1) * stoneCount / count) > Math.floor(index * stoneCount / count);
    const kind = index === 0 ? 'mystery-bag'
      : isStone ? 'stone' : rewards[(index + wave - 1) % rewards.length];
    return createItem(`wave-${wave}-${index + 1}`, kind, slot.x, slot.y + depth);
  });
}
