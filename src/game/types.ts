export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export type ItemKind = 'gold-small' | 'gold-medium' | 'gold-large' | 'stone' | 'diamond' | 'mystery-bag';

export interface MineItem extends Point {
  readonly id: string;
  readonly radius: number;
  readonly value: number;
  readonly kind: ItemKind;
  readonly weight: number;
}

export type HookPhase = 'swinging' | 'launching' | 'returning-empty' | 'returning-loaded';

export interface HookSnapshot {
  readonly phase: HookPhase;
  /** Radians relative to vertically down; positive angles point right. */
  readonly angle: number;
  readonly length: number;
  readonly position: Point;
  readonly carriedItemId: string | null;
  readonly grabOffset: Point | null;
}

export interface GameSnapshot {
  readonly hook: HookSnapshot;
  readonly items: readonly MineItem[];
  readonly score: number;
  readonly complete: boolean;
}

export interface GameConfig {
  readonly width: number;
  readonly height: number;
  readonly surfaceY: number;
  readonly origin: Point;
  readonly minLength: number;
  readonly maxAngle: number;
  readonly swingSpeed: number;
  readonly initialAngle: number;
  readonly launchSpeed: number;
  readonly emptyReturnSpeed: number;
  readonly loadedReturnSpeed: number;
  readonly hookRadius: number;
  readonly bounds: Rect;
  readonly fixedStep: number;
  readonly maxFrameDelta: number;
}
