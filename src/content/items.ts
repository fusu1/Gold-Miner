import type { ItemKind, MineItem } from '../game/types';

export interface ItemDefinition {
  readonly name: string;
  readonly radius: number;
  readonly value: number;
  readonly weight: number;
}

/** The only source of item economics and collision sizes. */
export const ITEM_DEFINITIONS: Readonly<Record<ItemKind, ItemDefinition>> = {
  'gold-small': { name: '小黄金', radius: 18, value: 50, weight: 1 },
  'gold-medium': { name: '中黄金', radius: 27, value: 150, weight: 2 },
  'gold-large': { name: '大黄金', radius: 40, value: 500, weight: 4 },
  stone: { name: '石头', radius: 30, value: 20, weight: 5 },
  diamond: { name: '钻石', radius: 16, value: 300, weight: 0.7 },
  'mystery-bag': { name: '问号袋', radius: 26, value: 0, weight: 1.5 },
};

export function createItem(id: string, kind: ItemKind, x: number, y: number): MineItem {
  const { radius, value, weight } = ITEM_DEFINITIONS[kind];
  return { id, kind, x, y, radius, value, weight };
}
