export type GameMode = 'level' | 'endless';
export type AppScreen = 'menu' | 'level-intro' | 'playing' | 'paused' | 'settings' | 'result' | 'shop';

export interface AppSnapshot {
  readonly screen: AppScreen;
  readonly mode: GameMode;
  readonly settingsReturn: 'menu' | 'paused';
}

/** Navigation state only. Simulation and window focus remain scene concerns. */
export class AppState {
  private screen: AppScreen = 'menu';
  private mode: GameMode = 'level';
  private settingsReturn: 'menu' | 'paused' = 'menu';

  getSnapshot(): AppSnapshot {
    return {
      screen: this.screen,
      mode: this.mode,
      settingsReturn: this.settingsReturn,
    };
  }

  selectMode(mode: GameMode): void {
    if (this.screen === 'menu') this.mode = mode;
  }

  start(): void {
    if (this.screen === 'menu') this.screen = this.roundEntryScreen;
  }

  beginLevel(): void {
    if (this.screen === 'level-intro') this.screen = 'playing';
  }

  pause(): void {
    if (this.screen === 'playing') this.screen = 'paused';
  }

  resume(): void {
    if (this.screen === 'paused') this.screen = 'playing';
  }

  restart(): void {
    if (this.screen === 'playing' || this.screen === 'paused' || this.screen === 'result') {
      this.screen = this.roundEntryScreen;
    }
  }

  showResult(): void {
    if (this.screen === 'playing') this.screen = 'result';
  }

  openShop(): void {
    if (this.screen === 'result') this.screen = 'shop';
  }

  continueFromShop(): void {
    if (this.screen === 'shop') this.screen = this.roundEntryScreen;
  }

  returnToMenu(): void {
    this.screen = 'menu';
  }

  openSettings(): void {
    if (this.screen !== 'menu' && this.screen !== 'paused') return;
    this.settingsReturn = this.screen;
    this.screen = 'settings';
  }

  closeSettings(): void {
    if (this.screen === 'settings') this.screen = this.settingsReturn;
  }

  handleEscape(): void {
    switch (this.screen) {
      case 'playing':
        this.pause();
        break;
      case 'paused':
        this.resume();
        break;
      case 'settings':
        this.closeSettings();
        break;
      case 'menu':
      case 'level-intro':
      case 'result':
      case 'shop':
        break;
    }
  }

  private get roundEntryScreen(): 'level-intro' | 'playing' {
    return this.mode === 'level' ? 'level-intro' : 'playing';
  }
}
