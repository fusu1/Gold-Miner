import { GAME_CONFIG, ITEM_LAYOUT } from './config';
import { findFirstItemHit, rayDistanceToBounds } from './collision';
import type { GameConfig, GameSnapshot, MineItem, HookPhase, Point } from './types';

/** Game rules only: independent of Phaser, DOM, input devices, and rendering. */
export class HookController {
  private phase: HookPhase = 'swinging';
  private angle = 0;
  private length = 0;
  private swingDirection = 1;
  private items: MineItem[] = [];
  private carriedItemId: string | null = null;
  private grabOffset: Point | null = null;
  private score = 0;
  private strengthMultiplier = 1;

  constructor(
    private readonly config: GameConfig = GAME_CONFIG,
    private readonly initialItems: readonly MineItem[] = ITEM_LAYOUT,
  ) {
    this.reset();
  }

  reset(): void {
    this.phase = 'swinging';
    this.angle = this.config.initialAngle;
    this.length = this.config.minLength;
    this.swingDirection = 1;
    this.items = this.initialItems.map((item) => ({ ...item }));
    this.carriedItemId = null;
    this.grabOffset = null;
    this.score = 0;
    this.strengthMultiplier = 1;
  }

  getSnapshot(): GameSnapshot {
    return {
      hook: {
        phase: this.phase,
        angle: this.angle,
        length: this.length,
        position: this.positionAt(this.length),
        carriedItemId: this.carriedItemId,
        grabOffset: this.grabOffset,
      },
      items: this.items,
      score: this.score,
      complete: this.items.length === 0 && this.phase === 'swinging',
    };
  }

  fire(): boolean {
    if (this.phase !== 'swinging' || this.items.length === 0) return false;
    this.phase = 'launching';
    return true;
  }

  setStrengthMultiplier(multiplier: number): void {
    if (Number.isFinite(multiplier) && multiplier > 0) this.strengthMultiplier = multiplier;
  }

  /** Detach and destroy the cargo; inventory and prices belong to the run rules. */
  destroyCarriedItem(): boolean {
    if (this.phase !== 'returning-loaded' || this.carriedItemId === null) return false;
    this.items = this.items.filter((item) => item.id !== this.carriedItemId);
    this.carriedItemId = null;
    this.grabOffset = null;
    this.phase = 'returning-empty';
    return true;
  }

  /** Returns cargo exactly once, when it reaches the surface; never on destruction. */
  step(seconds: number): MineItem | null {
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    if (this.items.length === 0 && this.phase === 'swinging') return null;

    switch (this.phase) {
      case 'swinging':
        this.swing(seconds);
        break;
      case 'launching':
        this.launch(seconds);
        break;
      case 'returning-empty':
      case 'returning-loaded':
        return this.retract(seconds);
    }
    return null;
  }

  private positionAt(length: number): Point {
    return {
      x: this.config.origin.x + Math.sin(this.angle) * length,
      y: this.config.origin.y + Math.cos(this.angle) * length,
    };
  }

  private swing(seconds: number): void {
    const limit = this.config.maxAngle;
    this.angle += this.swingDirection * this.config.swingSpeed * seconds;
    // Reflect the overshoot to retain a constant angular speed at the ends.
    while (this.angle > limit || this.angle < -limit) {
      if (this.angle > limit) {
        this.angle = 2 * limit - this.angle;
        this.swingDirection = -1;
      } else {
        this.angle = -2 * limit - this.angle;
        this.swingDirection = 1;
      }
    }
  }

  private launch(seconds: number): void {
    const start = this.positionAt(this.length);
    const maxLength = rayDistanceToBounds(this.config.origin, {
      x: Math.sin(this.angle),
      y: Math.cos(this.angle),
    }, this.config.bounds);
    const nextLength = Math.min(maxLength, this.length + this.config.launchSpeed * seconds);
    const hit = findFirstItemHit(start, this.positionAt(nextLength), this.items, this.config.hookRadius);

    if (hit) {
      this.length += (nextLength - this.length) * hit.t;
      this.carriedItemId = hit.item.id;
      this.grabOffset = { x: hit.item.x - hit.point.x, y: hit.item.y - hit.point.y };
      this.phase = 'returning-loaded';
    } else {
      this.length = nextLength;
      if (this.length >= maxLength) this.phase = 'returning-empty';
    }
  }

  private retract(seconds: number): MineItem | null {
    const carriedItem = this.items.find((item) => item.id === this.carriedItemId);
    const speed = this.phase === 'returning-loaded'
      ? Math.min(620, this.config.loadedReturnSpeed / (carriedItem?.weight ?? 1) * this.strengthMultiplier)
      : this.config.emptyReturnSpeed;
    this.length = Math.max(this.config.minLength, this.length - speed * seconds);
    if (this.length > this.config.minLength) return null;

    if (this.carriedItemId !== null) {
      const item = this.items.find((candidate) => candidate.id === this.carriedItemId);
      if (item) {
        this.score += item.value;
        this.items = this.items.filter((candidate) => candidate.id !== item.id);
      }
    }

    this.carriedItemId = null;
    this.grabOffset = null;
    this.phase = 'swinging';
    return carriedItem ?? null;
  }
}
