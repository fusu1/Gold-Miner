import Phaser from 'phaser';
import { AppState } from '../app/AppState';
import { SettingsStore } from '../app/SettingsStore';
import { KeyboardInput } from '../input/KeyboardInput';
import { AppUI } from '../ui/AppUI';
import { TouchControls } from '../ui/TouchControls';
import { GameView } from '../view/GameView';
import { preloadClassicAssets } from '../view/ClassicAssets';
import { getCargoDisplayPosition } from '../view/ItemPresentation';
import { GAME_CONFIG } from './config';
import { FixedStepClock } from './FixedStepClock';
import { RunController } from './RunController';
import type { RunSnapshot } from './runTypes';

/** Composes application navigation, simulation, native input, and presentation. */
export class GameScene extends Phaser.Scene {
  readonly run = new RunController();
  readonly appState = new AppState();
  private readonly settings = new SettingsStore();
  private readonly clock = new FixedStepClock(GAME_CONFIG.fixedStep, GAME_CONFIG.maxFrameDelta);
  private view!: GameView;
  private ui!: AppUI;
  private keyboard!: KeyboardInput;
  private shell!: HTMLElement;
  private touch!: TouchControls;
  private focusLost = false;
  private suspended = true;
  private discardNextDelta = true;
  private lastAnnouncement = '';

  constructor() {
    super('Game');
  }

  preload(): void {
    const title = this.add.text(GAME_CONFIG.width / 2, 300, '黄金矿工', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '44px', color: '#ffcf32', fontStyle: 'bold',
    }).setOrigin(0.5);
    const progress = this.add.text(GAME_CONFIG.width / 2, 370, '正在准备矿洞… 0%', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '20px', color: '#f7df9c',
    }).setOrigin(0.5);
    const updateProgress = (value: number): void => {
      progress.setText(`正在准备矿洞… ${Math.round(value * 100)}%`);
    };
    this.load.on(Phaser.Loader.Events.PROGRESS, updateProgress);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.PROGRESS, updateProgress);
      title.destroy();
      progress.destroy();
    });
    preloadClassicAssets(this);
  }

  create(): void {
    const parent = document.getElementById('game');
    if (!parent) throw new Error('The game container is missing.');
    this.shell = document.getElementById('game-shell')!;
    this.appState.returnToMenu();
    this.run.reset();
    this.clock.reset();
    this.view = new GameView(this);
    this.ui = new AppUI(parent, {
      selectMode: (mode) => {
        this.appState.selectMode(mode);
        this.refreshApp();
      },
      start: () => {
        if (this.appState.getSnapshot().screen !== 'menu') return;
        this.run.start(this.appState.getSnapshot().mode);
        this.view.resetEffects();
        this.appState.start();
        this.refreshApp();
      },
      beginLevel: () => {
        this.appState.beginLevel();
        this.refreshApp();
      },
      pause: () => {
        this.appState.pause();
        this.refreshApp();
      },
      resume: () => {
        this.appState.resume();
        this.refreshApp();
      },
      restart: () => { this.restartRun(); },
      returnToMenu: () => {
        this.appState.returnToMenu();
        this.run.reset();
        this.view.resetEffects();
        this.refreshApp();
      },
      enterShop: () => {
        if (!this.run.enterShop()) return;
        this.appState.openShop();
        this.refreshApp();
      },
      buy: (id) => {
        this.run.buy(id);
        this.refreshApp();
      },
      nextLevel: () => {
        if (!this.run.nextLevel()) return;
        this.view.resetEffects();
        this.appState.continueFromShop();
        this.refreshApp();
      },
      openSettings: () => {
        this.appState.openSettings();
        this.ui.setMessage('');
        this.refreshApp();
      },
      closeSettings: () => {
        this.appState.closeSettings();
        this.refreshApp();
      },
      setShowHints: (visible) => {
        this.settings.setShowHints(visible);
        this.refreshApp();
      },
      resetSettings: () => {
        this.settings.reset();
        this.ui.setMessage('已恢复默认设置。');
        this.refreshApp();
      },
      toggleFullscreen: () => { void this.toggleFullscreen(); },
    });
    this.touch = new TouchControls(this.shell, {
      fire: () => { this.fire(); },
      bomb: () => { this.useBomb(); },
      pause: () => {
        if (this.suspended) return;
        this.appState.pause();
        this.refreshApp();
      },
    });
    this.keyboard = new KeyboardInput({
      fire: () => { this.fire(); },
      bomb: () => { this.useBomb(); },
      reset: () => { this.restartRun(); },
      escape: () => {
        this.appState.handleEscape();
        this.refreshApp();
      },
    });

    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.focusLost = document.hidden || !document.hasFocus();
    this.refreshApp();
    this.view.render(this.run.getSnapshot());
  }

  update(_time: number, delta: number): void {
    if (!this.suspended) {
      if (!this.discardNextDelta) this.clock.advance(delta, (seconds) => {
        if (this.run.getSnapshot().status !== 'playing') return;
        this.run.step(seconds);
        this.view.advance(seconds);
      });
      this.discardNextDelta = false;
    }
    const snapshot = this.run.getSnapshot();
    if (this.appState.getSnapshot().screen === 'playing'
      && (snapshot.status === 'won' || snapshot.status === 'lost' || snapshot.status === 'completed')) {
      this.appState.showResult();
      this.refreshApp();
    }
    this.view.render(snapshot);
    this.renderTouch(snapshot);
    this.announce(snapshot);
  }

  private restartRun(): void {
    const screen = this.appState.getSnapshot().screen;
    if (screen !== 'paused' && screen !== 'playing' && screen !== 'result') return;
    const snapshot = this.run.getSnapshot();
    if (snapshot.status === 'completed') this.run.start(snapshot.mode);
    else if (!this.run.restart()) return;
    this.view.resetEffects();
    this.appState.restart();
    this.refreshApp();
  }

  private fire(): void {
    if (this.suspended) return;
    this.run.fire();
    this.renderTouch(this.run.getSnapshot());
  }

  private useBomb(): void {
    if (this.suspended) return;
    const snapshot = this.run.getSnapshot().game;
    const position = getCargoDisplayPosition(snapshot) ?? snapshot.hook.position;
    if (!this.run.useBomb()) return;
    this.view.playExplosion(position.x, position.y);
    this.renderTouch(this.run.getSnapshot());
  }

  private renderTouch(snapshot: RunSnapshot): void {
    this.touch.render(this.appState.getSnapshot().screen, snapshot,
      this.suspended, this.settings.getSnapshot().showHints);
  }

  private refreshApp(): void {
    const state = this.appState.getSnapshot();
    const settings = this.settings.getSnapshot();
    const snapshot = this.run.getSnapshot();
    this.suspended = state.screen !== 'playing' || snapshot.status !== 'playing' || this.focusLost;
    this.discardNextDelta = true;
    this.clock.reset();
    this.keyboard.setEnabled(!this.suspended);
    this.view.setPaused(state.screen === 'playing' && this.focusLost);
    this.view.setHintsVisible(settings.showHints && !this.touch.available);
    this.ui.render(state, settings, snapshot);
    this.renderTouch(snapshot);
    this.onFullscreenChange();
    this.announce(snapshot);
  }

  private readonly onBlur = (): void => {
    this.focusLost = true;
    this.refreshApp();
  };

  private readonly onFocus = (): void => {
    this.focusLost = document.hidden;
    this.refreshApp();
  };

  private readonly onVisibilityChange = (): void => {
    this.focusLost = document.hidden || !document.hasFocus();
    this.refreshApp();
  };

  private readonly onFullscreenChange = (): void => {
    this.ui.setFullscreen(
      document.fullscreenElement === this.shell,
      Boolean(document.fullscreenEnabled && this.shell.requestFullscreen),
    );
  };

  private async toggleFullscreen(): Promise<void> {
    this.ui.setMessage('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.shell.requestFullscreen();
    } catch {
      this.ui.setMessage('当前环境无法切换全屏，可在浏览器窗口中继续游玩。');
    }
    this.onFullscreenChange();
  }

  private announce(snapshot: RunSnapshot): void {
    const screen = this.appState.getSnapshot().screen;
    let text: string;
    if (screen === 'menu') text = '主菜单，选择模式并开始游戏。';
    else if (screen === 'level-intro') text = `第 ${snapshot.levelIndex + 1} 关，${snapshot.levelName}，目标金额 ${snapshot.target}。点击开始本关后计时。`;
    else if (screen === 'settings') text = '游戏设置。按 Esc 返回。';
    else if (screen === 'paused') text = '已暂停，可继续游戏、重新开始或返回菜单。';
    else if (screen === 'shop') text = `关间商店，余额 ${snapshot.wallet}。购买道具或进入下一关。`;
    else if (screen === 'result') text = snapshot.status === 'lost' ? '挑战失败，可以重试或返回菜单。'
      : snapshot.status === 'completed' ? '全部关卡通过，可以重新挑战或返回菜单。'
        : '本关通过，前往商店后进入下一关。';
    else if (this.focusLost) text = '已暂停，回到游戏窗口后继续。';
    else text = `${snapshot.levelName}，金额 ${snapshot.mode === 'endless' ? snapshot.totalScore : snapshot.roundScore}，剩余 ${snapshot.game.items.length} 件物品。`;
    if (snapshot.rewardNotice && (screen === 'playing' || screen === 'result')) {
      text = `${snapshot.rewardNotice}。${text}`;
    }
    if (text === this.lastAnnouncement) return;
    const status = document.getElementById('game-status');
    if (status) status.textContent = text;
    this.lastAnnouncement = text;
  }

  private cleanup(): void {
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
    this.keyboard.destroy();
    this.touch.destroy();
    this.ui.destroy();
    this.view.destroy();
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }
}
