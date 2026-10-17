import type { GameMode } from '../app/AppState';
import { createEndlessWave } from '../content/endless';
import { LEVELS, type LevelDefinition } from '../content/levels';
import { MYSTERY_BAG_RULES, rollMysteryReward } from '../content/mysteryBag';
import { GAME_CONFIG } from './config';
import { HookController } from './HookController';
import type { RunSnapshot, RunStatus, ShopItemId, ShopOffer } from './runTypes';

interface LevelCheckpoint {
  readonly wallet: number;
  readonly totalScore: number;
  readonly bombs: number;
  readonly strengthActive: boolean;
}

const ENDLESS_START_SECONDS = 60;
const ENDLESS_MAX_SECONDS = 90;
const MAX_BOMBS = 9;
const BOMB_PRICE = 100;
const STRENGTH_PRICE = 200;

/** Owns a whole run; the hook simulation remains unaware of levels and shops. */
export class RunController {
  private mode: GameMode = 'level';
  private status: RunStatus = 'idle';
  private hook: HookController;
  private levelIndex = 0;
  private round = 1;
  private timeRemaining = 0;
  private totalScore = 0;
  private wallet = 0;
  private bombs = 0;
  private strengthActive = false;
  private strengthQueued = false;
  private bombsBought = 0;
  private strengthBought = false;
  private lossReason: RunSnapshot['lossReason'] = null;
  private bonusScore = 0;
  private rewardNotice: string | null = null;
  private rewardNoticeRemaining = 0;
  private checkpoint: LevelCheckpoint = {
    wallet: 0, totalScore: 0, bombs: 1, strengthActive: false,
  };

  constructor(
    private readonly levels: readonly LevelDefinition[] = LEVELS,
    private readonly random: () => number = Math.random,
  ) {
    if (levels.length === 0) throw new Error('A run needs at least one level.');
    this.hook = new HookController(GAME_CONFIG, this.currentLevel.items);
  }

  getSnapshot(): RunSnapshot {
    const baseGame = this.hook.getSnapshot();
    const game = { ...baseGame, score: baseGame.score + this.bonusScore };
    return {
      mode: this.mode,
      status: this.status,
      game,
      levelIndex: this.levelIndex,
      round: this.round,
      levelName: this.mode === 'level' ? this.currentLevel.name : `第 ${this.round} 波`,
      target: this.mode === 'level' ? this.currentLevel.target : null,
      timeRemaining: this.timeRemaining,
      roundScore: game.score,
      totalScore: this.totalScore,
      wallet: this.wallet,
      bombs: this.bombs,
      strengthActive: this.strengthActive,
      strengthQueued: this.strengthQueued,
      shopOffers: this.getShopOffers(),
      lossReason: this.lossReason,
      rewardNotice: this.rewardNotice,
    };
  }

  start(mode: GameMode): void {
    this.reset();
    this.mode = mode;
    this.bombs = mode === 'level' ? 1 : 2;
    if (mode === 'level') this.startLevel();
    else this.startEndlessWave();
    this.status = 'playing';
  }

  reset(): void {
    this.mode = 'level';
    this.status = 'idle';
    this.levelIndex = 0;
    this.round = 1;
    this.timeRemaining = 0;
    this.totalScore = 0;
    this.wallet = 0;
    this.bombs = 0;
    this.strengthActive = false;
    this.strengthQueued = false;
    this.resetShop();
    this.lossReason = null;
    this.bonusScore = 0;
    this.rewardNotice = null;
    this.rewardNoticeRemaining = 0;
    this.hook = new HookController(GAME_CONFIG, this.currentLevel.items);
  }

  fire(): boolean {
    return this.status === 'playing' && this.hook.fire();
  }

  useBomb(): boolean {
    if (this.status !== 'playing' || this.bombs === 0 || !this.hook.destroyCarriedItem()) {
      return false;
    }
    this.bombs -= 1;
    return true;
  }

  step(seconds: number): void {
    if (this.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return;

    // Small slices preserve hook transitions and prevent simulation after the deadline.
    let remaining = seconds;
    while (remaining > 0 && this.status === 'playing') {
      const elapsed = Math.min(remaining, GAME_CONFIG.fixedStep, this.timeRemaining);
      if (elapsed <= 0) {
        this.lose('timeout');
        break;
      }

      const scoreBefore = this.hook.getSnapshot().score + this.bonusScore;
      this.rewardNoticeRemaining = Math.max(0, this.rewardNoticeRemaining - elapsed);
      if (this.rewardNoticeRemaining === 0) this.rewardNotice = null;
      const collected = this.hook.step(elapsed);
      if (collected?.kind === 'mystery-bag') this.openMysteryBag();
      this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);
      remaining = Math.max(0, remaining - elapsed);
      const game = this.hook.getSnapshot();
      const roundScore = game.score + this.bonusScore;
      const collectedValue = roundScore - scoreBefore;

      if (this.mode === 'level') {
        if (roundScore >= this.currentLevel.target) {
          this.wallet += roundScore;
          this.totalScore += roundScore;
          this.status = this.levelIndex === this.levels.length - 1 ? 'completed' : 'won';
        } else if (this.timeRemaining === 0) {
          this.lose('timeout');
        } else if (game.complete) {
          this.lose('depleted');
        }
      } else {
        if (collected) {
          this.totalScore += collectedValue;
          const itemBonus = Math.max(1, 3 - 0.15 * (this.round - 1));
          this.addEndlessTime(itemBonus);
        }
        if (this.timeRemaining === 0) {
          this.lose('timeout');
        } else if (game.complete && game.hook.phase === 'swinging') {
          this.round += 1;
          this.addEndlessTime(10);
          this.bombs = Math.min(3, this.bombs + 1);
          this.startEndlessWave(false);
        }
      }
    }
  }

  restart(): boolean {
    if (this.status !== 'playing' && this.status !== 'lost') return false;
    if (this.mode === 'endless') {
      this.start('endless');
    } else {
      this.wallet = this.checkpoint.wallet;
      this.totalScore = this.checkpoint.totalScore;
      this.bombs = this.checkpoint.bombs;
      this.strengthActive = this.checkpoint.strengthActive;
      this.strengthQueued = false;
      this.startLevel();
      this.status = 'playing';
    }
    return true;
  }

  enterShop(): boolean {
    if (this.status !== 'won') return false;
    this.status = 'shopping';
    return true;
  }

  buy(id: ShopItemId): boolean {
    const offer = this.getShopOffers().find((candidate) => candidate.id === id);
    if (!offer?.canBuy) return false;
    this.wallet -= offer.price;
    if (id === 'bomb') {
      this.bombs += 1;
      this.bombsBought += 1;
    } else {
      this.strengthQueued = true;
      this.strengthBought = true;
    }
    return true;
  }

  nextLevel(): boolean {
    if (this.status !== 'shopping' || this.levelIndex >= this.levels.length - 1) return false;
    this.levelIndex += 1;
    this.round = this.levelIndex + 1;
    this.strengthActive = this.strengthQueued;
    this.strengthQueued = false;
    this.startLevel();
    this.status = 'playing';
    return true;
  }

  private get currentLevel(): LevelDefinition {
    return this.levels[this.levelIndex];
  }

  private startLevel(): void {
    this.bonusScore = 0;
    this.rewardNotice = null;
    this.rewardNoticeRemaining = 0;
    this.hook = new HookController(GAME_CONFIG, this.currentLevel.items);
    this.hook.setStrengthMultiplier(this.strengthActive ? 1.5 : 1);
    this.timeRemaining = this.currentLevel.duration;
    this.lossReason = null;
    this.resetShop();
    this.checkpoint = {
      wallet: this.wallet,
      totalScore: this.totalScore,
      bombs: this.bombs,
      strengthActive: this.strengthActive,
    };
  }

  private startEndlessWave(resetTimer = true): void {
    this.bonusScore = 0;
    const swingMultiplier = 1 + Math.min(0.6, (this.round - 1) * 0.05);
    this.hook = new HookController({
      ...GAME_CONFIG,
      swingSpeed: GAME_CONFIG.swingSpeed * swingMultiplier,
    }, createEndlessWave(this.round));
    if (resetTimer) this.timeRemaining = ENDLESS_START_SECONDS;
    this.lossReason = null;
  }

  private addEndlessTime(seconds: number): void {
    this.timeRemaining = Math.min(ENDLESS_MAX_SECONDS, this.timeRemaining + seconds);
  }

  private openMysteryBag(): void {
    const reward = rollMysteryReward(this.random);
    const bombLimit = this.mode === 'endless' ? 3 : MAX_BOMBS;
    if (reward.kind === 'bomb' && this.bombs < bombLimit) {
      this.bombs += 1;
      this.rewardNotice = '问号袋：炸药 +1';
    } else {
      const money = reward.kind === 'money' ? reward.amount : MYSTERY_BAG_RULES.fullInventoryMoney;
      this.bonusScore += money;
      this.rewardNotice = reward.kind === 'money'
        ? `问号袋：金币 +${money}` : `炸药已满，问号袋折合 ${money} 金币`;
    }
    this.rewardNoticeRemaining = MYSTERY_BAG_RULES.noticeSeconds;
  }

  private lose(reason: NonNullable<RunSnapshot['lossReason']>): void {
    this.status = 'lost';
    this.lossReason = reason;
  }

  private resetShop(): void {
    this.bombsBought = 0;
    this.strengthBought = false;
  }

  private getShopOffers(): readonly ShopOffer[] {
    const bombRemaining = Math.max(0, Math.min(3 - this.bombsBought, MAX_BOMBS - this.bombs));
    const strengthRemaining = this.strengthBought ? 0 : 1;
    const makeOffer = (
      id: ShopItemId, name: string, description: string, price: number, remaining: number,
      unavailableReason: string,
    ): ShopOffer => {
      const disabledReason = this.status !== 'shopping' ? '请先进入商店'
        : remaining === 0 ? unavailableReason
          : this.wallet < price ? '余额不足' : '';
      return { id, name, description, price, remaining, canBuy: disabledReason === '', disabledReason };
    };

    return [
      makeOffer('bomb', '炸药', '拖拽物品时按 ↑ 销毁物品，每间商店限购 3 枚，最多携带 9 枚。',
        BOMB_PRICE, bombRemaining, this.bombs >= MAX_BOMBS ? '炸药库存已满' : '本次已售罄'),
      makeOffer('strength', '力量药水', '下一关负重回收速度提高 50%，每间商店限购 1 瓶。',
        STRENGTH_PRICE, strengthRemaining, '本次已购买'),
    ];
  }
}
