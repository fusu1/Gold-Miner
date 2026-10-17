import type { GameMode } from '../app/AppState';
import type { GameSnapshot } from './types';

export type ShopItemId = 'bomb' | 'strength';
export type RunStatus = 'idle' | 'playing' | 'won' | 'lost' | 'shopping' | 'completed';

export interface ShopOffer {
  readonly id: ShopItemId;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  readonly remaining: number;
  readonly canBuy: boolean;
  readonly disabledReason: string;
}

export interface RunSnapshot {
  readonly mode: GameMode;
  readonly status: RunStatus;
  readonly game: GameSnapshot;
  readonly levelIndex: number;
  readonly round: number;
  readonly levelName: string;
  readonly target: number | null;
  readonly timeRemaining: number;
  readonly roundScore: number;
  readonly totalScore: number;
  readonly wallet: number;
  readonly bombs: number;
  readonly strengthActive: boolean;
  readonly strengthQueued: boolean;
  readonly shopOffers: readonly ShopOffer[];
  readonly lossReason: 'timeout' | 'depleted' | null;
  readonly rewardNotice: string | null;
}
