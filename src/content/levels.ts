import type { ItemKind, MineItem } from '../game/types';
import { createItem } from './items';

export interface LevelDefinition {
  readonly id: string;
  readonly name: string;
  readonly target: number;
  readonly duration: number;
  readonly items: readonly MineItem[];
}

type Placement = readonly [kind: ItemKind, x: number, y: number];

function level(
  id: string,
  name: string,
  target: number,
  duration: number,
  placements: readonly Placement[],
): LevelDefinition {
  return {
    id, name, target, duration,
    items: [
      ...placements.map(([kind, x, y], index) => createItem(`${id}-${index + 1}`, kind, x, y)),
      createItem(`${id}-bag`, 'mystery-bag', 640, 610),
    ],
  };
}

/** Hand-authored layouts: fixed coordinates keep aiming and balancing reproducible. */
export const LEVELS: readonly LevelDefinition[] = [
  level('level-1', '初探矿洞', 300, 60, [
    ['gold-medium', 190, 265], ['gold-small', 390, 250],
    ['gold-medium', 610, 260], ['gold-small', 790, 290],
    ['gold-small', 280, 390], ['gold-small', 500, 380],
    ['stone', 700, 420], ['stone', 360, 570],
  ]),
  level('level-2', '金石之间', 650, 60, [
    ['stone', 190, 265], ['gold-medium', 390, 250],
    ['gold-small', 610, 260], ['gold-medium', 790, 290],
    ['gold-medium', 280, 390], ['stone', 500, 380],
    ['gold-small', 700, 420], ['gold-large', 360, 570],
    ['diamond', 820, 570],
  ]),
  level('level-3', '深处的光', 1000, 65, [
    ['gold-small', 190, 265], ['stone', 390, 250],
    ['gold-medium', 610, 260], ['gold-small', 790, 290],
    ['stone', 280, 390], ['gold-medium', 500, 380],
    ['gold-medium', 700, 420], ['diamond', 130, 560],
    ['gold-large', 360, 570], ['diamond', 820, 570],
  ]),
  level('level-4', '重岩矿脉', 1400, 70, [
    ['gold-small', 190, 265], ['stone', 390, 250],
    ['gold-medium', 610, 260], ['stone', 790, 290],
    ['gold-medium', 280, 390], ['gold-large', 500, 380],
    ['stone', 700, 420], ['diamond', 130, 560],
    ['gold-large', 360, 570], ['gold-medium', 570, 580],
    ['diamond', 820, 570], ['gold-small', 100, 400],
  ]),
  level('level-5', '黄金宝藏', 1800, 75, [
    ['stone', 190, 265], ['gold-medium', 390, 250],
    ['gold-medium', 610, 260], ['stone', 790, 290],
    ['gold-large', 280, 390], ['stone', 500, 380],
    ['gold-large', 700, 420], ['diamond', 130, 560],
    ['gold-large', 360, 570], ['gold-medium', 570, 580],
    ['diamond', 820, 570], ['stone', 100, 400],
    ['gold-small', 860, 410],
  ]),
];
