import type { GameConfig, MineItem } from './types';

/** Distances are logical pixels, time is seconds, angles are radians. */
export const GAME_CONFIG: GameConfig = {
  width: 960,
  height: 720,
  surfaceY: 112,
  origin: { x: 480, y: 104 },
  minLength: 42,
  maxAngle: Math.PI * 75 / 180,
  swingSpeed: Math.PI * 40 / 180,
  initialAngle: -Math.PI / 6,
  launchSpeed: 520,
  emptyReturnSpeed: 620,
  loadedReturnSpeed: 300,
  hookRadius: 5,
  bounds: { left: 20, right: 940, top: 112, bottom: 660 },
  fixedStep: 1 / 120,
  maxFrameDelta: 0.25,
};

/** Small, predictable fixture for the standalone hook controller. Runs supply their own layout. */
export const ITEM_LAYOUT: readonly MineItem[] = [
  { id: 'gold-1', x: 210, y: 300, radius: 30, value: 100, kind: 'gold-medium', weight: 1 },
  { id: 'gold-2', x: 650, y: 285, radius: 30, value: 100, kind: 'gold-medium', weight: 1 },
  { id: 'gold-3', x: 390, y: 430, radius: 30, value: 100, kind: 'gold-medium', weight: 1 },
  { id: 'gold-4', x: 775, y: 510, radius: 30, value: 100, kind: 'gold-medium', weight: 1 },
  { id: 'gold-5', x: 520, y: 595, radius: 30, value: 100, kind: 'gold-medium', weight: 1 },
];
