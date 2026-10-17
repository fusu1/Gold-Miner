import type Phaser from 'phaser';
import type { ItemKind } from '../game/types';

type Bounds = readonly [left: number, top: number, right: number, bottom: number];
interface ClassicAsset {
  readonly key: string;
  readonly url: string;
  /** Alpha > 16 bounds, excluding faint generation noise. Original PNGs stay untouched. */
  readonly bounds?: Bounds;
}
const still = (name: string, bounds?: Bounds): ClassicAsset => ({
  key: `classic-${name}`, url: `${import.meta.env.BASE_URL}assets/classic-v1/${name}.png`, bounds,
});
const motion = (folder: string, name: string): ClassicAsset => ({
  key: `classic-${folder === 'miner' ? 'miner-' : ''}${name}`,
  url: `${import.meta.env.BASE_URL}assets/classic-motion-v1/${folder}/${name}.png`,
});
export const CLASSIC_ASSETS = {
  mine: still('mine-background'),
  minerIdle: still('miner-idle'),
  winch: still('winch', [49, 210, 1236, 1063]),
  hookOpen: still('hook-open', [175, 137, 1079, 1051]),
  hookClosed: still('hook-closed', [364, 137, 890, 1047]),
  goldSmall: still('gold-small', [157, 163, 1099, 1099]),
  goldMedium: still('gold-medium', [119, 190, 1149, 1066]),
  goldLarge: still('gold-large', [110, 130, 1142, 1144]),
  stone: still('stone', [93, 207, 1176, 1028]),
  diamond: still('diamond', [165, 240, 1089, 1059]),
  mysteryBag: still('mystery-bag', [241, 170, 1013, 1100]),
  dynamite: still('dynamite', [286, 54, 1087, 1182]),
  strength: still('strength-potion', [170, 50, 1080, 1202]),
  minerPull: [1, 2, 3, 4].map((index) => motion('miner', `pull-0${index}`)),
  explosion: [1, 2, 3, 4, 5, 6].map((index) => motion('explosion', `blast-0${index}`)),
} as const;
export const ITEM_ASSETS: Record<ItemKind, ClassicAsset> = {
  'gold-small': CLASSIC_ASSETS.goldSmall,
  'gold-medium': CLASSIC_ASSETS.goldMedium,
  'gold-large': CLASSIC_ASSETS.goldLarge,
  stone: CLASSIC_ASSETS.stone,
  diamond: CLASSIC_ASSETS.diamond,
  'mystery-bag': CLASSIC_ASSETS.mysteryBag,
};
/** Logical-pixel display sizes. Motion frames retain their original common canvas. */
export const CLASSIC_LAYOUT = {
  miner: {
    x: 520, baselineY: 109, canvasSize: 112,
    idleAnchor: { x: 0.58, y: 1214 / 1254 },
    pullAnchor: { x: 0.5, y: 0.982 },
    pullOffsetY: [0, 0, 0.001595, 0],
    frameSeconds: [0.16, 0.16, 0.16, 0.16],
  },
  hook: {
    height: 30,
    openAnchor: { x: (627 - 175) / 904, y: 1 },
    closedAnchor: { x: (627 - 364) / 526, y: 1 },
    attachmentFromTip: 27.5,
  },
  explosion: {
    canvasSize: 176,
    frameSeconds: [0.045, 0.065, 0.07, 0.08, 0.1, 0.14],
    finalFadeSeconds: 0.14,
  },
} as const;

export function preloadClassicAssets(scene: Phaser.Scene): void {
  const assets: readonly ClassicAsset[] = [
    CLASSIC_ASSETS.mine, CLASSIC_ASSETS.minerIdle, CLASSIC_ASSETS.winch,
    CLASSIC_ASSETS.hookOpen, CLASSIC_ASSETS.hookClosed,
    ...Object.values(ITEM_ASSETS), CLASSIC_ASSETS.dynamite, CLASSIC_ASSETS.strength,
    ...CLASSIC_ASSETS.minerPull, ...CLASSIC_ASSETS.explosion,
  ];
  for (const asset of assets) {
    if (!scene.textures.exists(asset.key)) scene.load.image(asset.key, asset.url);
  }
}

/** References a visible rectangle in the existing GPU texture without changing any PNG. */
export function classicFrame(scene: Phaser.Scene, asset: ClassicAsset): string {
  if (!asset.bounds) return '__BASE';
  const texture = scene.textures.get(asset.key);
  if (!texture.has('visible')) {
    const [left, top, right, bottom] = asset.bounds;
    texture.add('visible', 0, left, top, right - left, bottom - top);
  }
  return 'visible';
}
