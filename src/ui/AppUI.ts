import type { AppSnapshot, GameMode } from '../app/AppState';
import type { UserSettings } from '../app/SettingsStore';
import type { RunSnapshot, ShopItemId } from '../game/runTypes';
import './menu.css';

export interface AppUIActions {
  selectMode(mode: GameMode): void;
  start(): void;
  beginLevel(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  returnToMenu(): void;
  openSettings(): void;
  closeSettings(): void;
  setShowHints(visible: boolean): void;
  resetSettings(): void;
  toggleFullscreen(): void;
  enterShop(): void;
  buy(id: ShopItemId): void;
  nextLevel(): void;
}

interface ShopItemElements {
  readonly name: HTMLElement;
  readonly description: HTMLElement;
  readonly price: HTMLElement;
  readonly remaining: HTMLElement;
  readonly reason: HTMLElement;
  readonly button: HTMLButtonElement;
}

let nextUIId = 0;

/** DOM controls are created once; render only synchronizes state and focus. */
export class AppUI {
  private readonly root: HTMLDivElement;
  private readonly menu: HTMLElement;
  private readonly levelIntro: HTMLElement;
  private readonly introLevel: HTMLElement;
  private readonly introTarget: HTMLElement;
  private readonly introTime: HTMLElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly pauseDialog: HTMLElement;
  private readonly settingsDialog: HTMLElement;
  private readonly resultDialog: HTMLElement;
  private readonly shopDialog: HTMLElement;
  private readonly resultTitle: HTMLElement;
  private readonly resultDescription: HTMLElement;
  private readonly resultScore: HTMLElement;
  private readonly resultScoreLabel: HTMLElement;
  private readonly resultTarget: HTMLElement;
  private readonly resultTargetLabel: HTMLElement;
  private readonly resultTime: HTMLElement;
  private readonly resultTotal: HTMLElement;
  private readonly resultTotalLabel: HTMLElement;
  private readonly resultRestart: HTMLButtonElement;
  private readonly enterShopButton: HTMLButtonElement;
  private readonly shopBalance: HTMLElement;
  private readonly nextLevelLabel: HTMLElement;
  private readonly shopInventory: HTMLElement;
  private readonly shopItems: Record<ShopItemId, ShopItemElements>;
  private readonly levelButton: HTMLButtonElement;
  private readonly endlessButton: HTMLButtonElement;
  private readonly hintsCheckbox: HTMLInputElement;
  private readonly fullscreenButton: HTMLButtonElement;
  private readonly fullscreenState: HTMLElement;
  private readonly status: HTMLElement;
  private state: AppSnapshot | null = null;
  private settingsInvoker: HTMLElement | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly actions: AppUIActions,
  ) {
    const id = `gm-ui-${nextUIId++}`;
    this.root = document.createElement('div');
    this.root.className = 'gm-ui';
    const asset = (file: string): string => new URL(
      `${import.meta.env.BASE_URL}assets/classic-v1/${file}`, document.baseURI,
    ).href;
    this.root.style.setProperty('--gm-panel-image', `url("${asset('panel-brown.png')}")`);
    this.root.style.setProperty('--gm-button-image', `url("${asset('button-gold.png')}")`);
    this.root.style.setProperty('--gm-intro-image', `url("${asset('level-intro-background.png')}")`);
    this.root.innerHTML = `
      <section class="gm-menu" aria-labelledby="${id}-title" hidden>
        <div class="gm-menu-layout">
        <img class="gm-menu-miner" src="${asset('menu-miner.png')}" alt="" aria-hidden="true" draggable="false" />
        <div class="gm-menu-content">
          <header class="gm-menu-heading">
            <h1 id="${id}-title">黄金矿工</h1>
          </header>
          <button class="gm-start-gold" type="button" data-action="start">
            <img src="${asset('start-gold.png')}" alt="" aria-hidden="true" draggable="false" />
            <span>开始游戏</span>
          </button>
          <section class="gm-mode-selection" aria-labelledby="${id}-mode-title">
            <h2 id="${id}-mode-title" class="gm-section-label">选择模式</h2>
            <div class="gm-mode-options">
              <button class="gm-mode-card" type="button" data-action="level" aria-pressed="true">
                <span class="gm-mode-copy"><span class="gm-mode-name">关卡模式</span><span class="gm-mode-description">5关挑战与关间商店</span></span>
                <span class="gm-selection-state" aria-hidden="true">已选择</span>
              </button>
              <button class="gm-mode-card" type="button" data-action="endless" aria-pressed="false">
                <span class="gm-mode-copy"><span class="gm-mode-name">无尽模式</span><span class="gm-mode-description">计时生存，采集补充时间</span></span>
                <span class="gm-selection-state" aria-hidden="true">已选择</span>
              </button>
            </div>
          </section>
          <div class="gm-menu-actions">
            <button class="gm-button gm-button-secondary" type="button" data-action="menu-settings">游戏设置</button>
          </div>
          <p class="gm-prototype-note"><span class="gm-desktop-copy">↓ / Space 出钩 · ↑ 使用炸药 · Esc 暂停</span><span class="gm-touch-copy">点出钩采集 · 拖拽时可用炸药</span></p>
        </div>
        </div>
      </section>
      <div class="gm-dialog-layer gm-level-intro" data-panel="level-intro" hidden>
        <div class="gm-intro-layout">
          <h1 class="gm-intro-title" aria-hidden="true">黄金矿工</h1>
          <section class="gm-dialog gm-intro-dialog" role="dialog" aria-modal="true"
            aria-labelledby="${id}-intro-title"
            aria-describedby="${id}-intro-goal ${id}-intro-target ${id}-intro-time" tabindex="-1">
            <h2 id="${id}-intro-title" data-intro-level>第 1 关</h2>
            <p class="gm-intro-goal" id="${id}-intro-goal">本关目标金额</p>
            <strong class="gm-intro-target" id="${id}-intro-target" data-intro-target>$0</strong>
            <p class="gm-intro-time" id="${id}-intro-time" data-intro-time>本关时间 60 秒</p>
            <button class="gm-button gm-button-primary" type="button" data-action="begin-level">开始本关</button>
            <button class="gm-text-button" type="button" data-action="return-menu">返回菜单</button>
          </section>
        </div>
      </div>
      <button class="gm-pause-trigger" type="button" data-action="pause" hidden>
        暂停 <span>Esc</span>
      </button>
      <div class="gm-dialog-layer" data-panel="pause" hidden>
        <section class="gm-dialog gm-pause-dialog" role="dialog" aria-modal="true"
          aria-labelledby="${id}-pause-title" tabindex="-1">
          <p class="gm-eyebrow">休息一下</p>
          <h2 id="${id}-pause-title">游戏暂停</h2>
          <p class="gm-dialog-subtitle">准备好后，继续采集黄金。</p>
          <div class="gm-dialog-actions">
            <button class="gm-button gm-button-primary" type="button" data-action="resume">继续游戏</button>
            <button class="gm-button gm-button-secondary" type="button" data-action="restart">重新开始</button>
            <button class="gm-button gm-button-secondary" type="button" data-action="return-menu">返回菜单</button>
          </div>
          <button class="gm-text-button" type="button" data-action="pause-settings">游戏设置</button>
          <p class="gm-keyboard-note">按 Esc 继续游戏</p>
        </section>
      </div>
      <div class="gm-dialog-layer" data-panel="settings" hidden>
        <section class="gm-dialog gm-settings-dialog" role="dialog" aria-modal="true"
          aria-labelledby="${id}-settings-title" tabindex="-1">
          <header class="gm-settings-header">
            <h2 id="${id}-settings-title">游戏设置</h2>
            <button class="gm-text-button" type="button" data-action="reset-settings">恢复默认设置</button>
          </header>
          <div class="gm-setting-row">
            <label class="gm-check-label" for="${id}-hints">显示操作提示</label>
            <input id="${id}-hints" type="checkbox" data-setting="hints" checked />
          </div>
          <div class="gm-setting-row">
            <div><span class="gm-setting-name">全屏显示</span><p class="gm-setting-detail" data-fullscreen-state>当前为窗口模式</p></div>
            <button class="gm-small-button" type="button" data-action="fullscreen" aria-pressed="false">进入全屏</button>
          </div>
          <div class="gm-setting-row gm-setting-disabled">
            <label class="gm-check-label" for="${id}-music">背景音乐<span class="gm-setting-detail">音频尚未接入</span></label>
            <input id="${id}-music" type="checkbox" disabled />
          </div>
          <div class="gm-setting-row gm-setting-disabled">
            <label class="gm-check-label" for="${id}-sound">游戏音效<span class="gm-setting-detail">音频尚未接入</span></label>
            <input id="${id}-sound" type="checkbox" disabled />
          </div>
          <div class="gm-controls-guide" aria-labelledby="${id}-controls-title">
            <p class="gm-touch-copy">画面下方点「出钩」采集，拖拽时点「炸药」丢弃物品；点「暂停」可重新开始或返回菜单。</p>
            <h3 id="${id}-controls-title">键盘操作</h3>
            <dl>
              <div><dt><kbd>↓</kbd> / <kbd>Space</kbd></dt><dd>发射钩子</dd></div>
              <div><dt><kbd>↑</kbd></dt><dd>使用炸药</dd></div>
              <div><dt><kbd>R</kbd></dt><dd>重新开始</dd></div>
              <div><dt><kbd>Esc</kbd></dt><dd>暂停 / 继续</dd></div>
            </dl>
          </div>
          <p class="gm-settings-message" role="status" aria-live="polite" hidden></p>
          <button class="gm-button gm-button-primary" type="button" data-action="close-settings">返回</button>
        </section>
      </div>
      <div class="gm-dialog-layer" data-panel="result" hidden>
        <section class="gm-dialog gm-result-dialog" role="dialog" aria-modal="true"
          aria-labelledby="${id}-result-title" tabindex="-1">
          <p class="gm-eyebrow">挑战结算</p>
          <h2 id="${id}-result-title" data-result-title>本关通过</h2>
          <p class="gm-dialog-subtitle" data-result-description></p>
          <dl class="gm-result-stats">
            <div><dt data-result-score-label>本关金额</dt><dd data-result-score>0</dd></div>
            <div><dt data-result-target-label>目标金额</dt><dd data-result-target>0</dd></div>
            <div><dt>剩余时间</dt><dd data-result-time>0 秒</dd></div>
            <div><dt data-result-total-label>购物余额</dt><dd data-result-total>0</dd></div>
          </dl>
          <div class="gm-dialog-actions">
            <button class="gm-button gm-button-primary" type="button" data-action="enter-shop">前往商店</button>
            <button class="gm-button gm-button-primary" type="button" data-action="result-restart">重试本关</button>
            <button class="gm-button gm-button-secondary" type="button" data-action="return-menu">返回菜单</button>
          </div>
        </section>
      </div>
      <div class="gm-dialog-layer" data-panel="shop" hidden>
        <section class="gm-dialog gm-shop-dialog" role="dialog" aria-modal="true"
          aria-labelledby="${id}-shop-title" tabindex="-1">
          <header class="gm-shop-header">
            <div><p class="gm-eyebrow">关间准备</p><h2 id="${id}-shop-title">道具商店</h2></div>
            <p class="gm-shop-balance">购物余额<strong data-shop-balance>0</strong></p>
          </header>
          <p class="gm-shop-next" data-next-level></p>
          <div class="gm-shop-items">
            <article class="gm-shop-item" data-item="bomb">
              <div class="gm-shop-icon" aria-hidden="true">
                <img src="${asset('dynamite.png')}" alt="" draggable="false" />
              </div>
              <div class="gm-shop-copy"><h3 data-shop-name>炸药</h3><p data-shop-description></p><p class="gm-shop-remaining" data-shop-remaining></p></div>
              <div class="gm-shop-purchase"><strong data-shop-price></strong><button class="gm-small-button" type="button" data-action="buy" data-shop-id="bomb">购买</button></div>
              <p class="gm-shop-reason" data-shop-reason></p>
            </article>
            <article class="gm-shop-item" data-item="strength">
              <div class="gm-shop-icon" aria-hidden="true">
                <img src="${asset('strength-potion.png')}" alt="" draggable="false" />
              </div>
              <div class="gm-shop-copy"><h3 data-shop-name>力量药水</h3><p data-shop-description></p><p class="gm-shop-remaining" data-shop-remaining></p></div>
              <div class="gm-shop-purchase"><strong data-shop-price></strong><button class="gm-small-button" type="button" data-action="buy" data-shop-id="strength">购买</button></div>
              <p class="gm-shop-reason" data-shop-reason></p>
            </article>
          </div>
          <p class="gm-shop-inventory" data-shop-inventory role="status" aria-live="polite"></p>
          <div class="gm-dialog-actions">
            <button class="gm-button gm-button-primary" type="button" data-action="next-level">进入下一关</button>
            <button class="gm-button gm-button-secondary" type="button" data-action="return-menu">返回菜单</button>
          </div>
        </section>
      </div>
    `;
    parent.append(this.root);
    this.menu = this.find('.gm-menu');
    this.levelIntro = this.find('[data-panel="level-intro"]');
    this.introLevel = this.find('[data-intro-level]');
    this.introTarget = this.find('[data-intro-target]');
    this.introTime = this.find('[data-intro-time]');
    this.pauseButton = this.find('[data-action="pause"]');
    this.pauseDialog = this.find('[data-panel="pause"]');
    this.settingsDialog = this.find('[data-panel="settings"]');
    this.resultDialog = this.find('[data-panel="result"]');
    this.shopDialog = this.find('[data-panel="shop"]');
    this.resultTitle = this.find('[data-result-title]');
    this.resultDescription = this.find('[data-result-description]');
    this.resultScore = this.find('[data-result-score]');
    this.resultScoreLabel = this.find('[data-result-score-label]');
    this.resultTarget = this.find('[data-result-target]');
    this.resultTargetLabel = this.find('[data-result-target-label]');
    this.resultTime = this.find('[data-result-time]');
    this.resultTotal = this.find('[data-result-total]');
    this.resultTotalLabel = this.find('[data-result-total-label]');
    this.resultRestart = this.find('[data-action="result-restart"]');
    this.enterShopButton = this.find('[data-action="enter-shop"]');
    this.shopBalance = this.find('[data-shop-balance]');
    this.nextLevelLabel = this.find('[data-next-level]');
    this.shopInventory = this.find('[data-shop-inventory]');
    this.shopItems = { bomb: this.findShopItem('bomb'), strength: this.findShopItem('strength') };
    this.levelButton = this.find('[data-action="level"]');
    this.endlessButton = this.find('[data-action="endless"]');
    this.hintsCheckbox = this.find('[data-setting="hints"]');
    this.fullscreenButton = this.find('[data-action="fullscreen"]');
    this.fullscreenState = this.find('[data-fullscreen-state]');
    this.status = this.find('.gm-settings-message');
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('change', this.onChange);
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('focusin', this.onFocusIn);
  }

  render(state: AppSnapshot, settings: UserSettings, run: RunSnapshot): void {
    const previousScreen = this.state?.screen;
    const screenChanged = previousScreen !== state.screen;
    const activeElement = document.activeElement;
    if (screenChanged && state.screen === 'settings') {
      this.settingsInvoker = document.activeElement instanceof HTMLElement
        ? document.activeElement : null;
      this.setMessage('');
    }
    this.state = { ...state };
    this.root.dataset.screen = state.screen;
    this.menu.hidden = state.screen !== 'menu'
      && !(state.screen === 'settings' && state.settingsReturn === 'menu');
    this.menu.inert = state.screen !== 'menu';
    this.pauseButton.hidden = state.screen !== 'playing';
    this.pauseDialog.hidden = state.screen !== 'paused';
    this.settingsDialog.hidden = state.screen !== 'settings';
    this.resultDialog.hidden = state.screen !== 'result';
    this.shopDialog.hidden = state.screen !== 'shop';
    this.levelIntro.hidden = state.screen !== 'level-intro';
    for (const layer of [this.levelIntro, this.pauseDialog, this.settingsDialog,
      this.resultDialog, this.shopDialog]) layer.inert = layer.hidden;
    this.levelButton.setAttribute('aria-pressed', String(state.mode === 'level'));
    this.endlessButton.setAttribute('aria-pressed', String(state.mode === 'endless'));
    this.hintsCheckbox.checked = settings.showHints;
    if (state.screen === 'result') this.renderResult(run);
    if (state.screen === 'shop') this.renderShop(run);
    if (state.screen === 'level-intro') this.renderLevelIntro(run);

    if (!screenChanged) {
      if (state.screen === 'shop' && activeElement instanceof HTMLButtonElement
        && activeElement.disabled) this.focusAction('next-level');
      return;
    }
    if (previousScreen === 'settings' && this.settingsInvoker
      && this.root.contains(this.settingsInvoker) && !this.settingsInvoker.closest('[hidden]')) {
      this.settingsInvoker.focus({ preventScroll: true });
      this.settingsInvoker = null;
    } else if (state.screen === 'menu') {
      this.focusAction('start');
    } else if (state.screen === 'paused') {
      this.focusAction('resume');
    } else if (state.screen === 'settings') {
      this.hintsCheckbox.focus({ preventScroll: true });
    } else if (state.screen === 'result') {
      this.focusAction(run.status === 'won' ? 'enter-shop' : 'result-restart');
    } else if (state.screen === 'shop') {
      this.focusAction('next-level');
    } else if (state.screen === 'level-intro') {
      this.focusAction('begin-level');
    } else {
      this.parent.focus({ preventScroll: true });
    }
  }

  setFullscreen(active: boolean, supported: boolean): void {
    this.fullscreenButton.disabled = !supported;
    this.fullscreenButton.setAttribute('aria-pressed', String(active));
    this.fullscreenButton.textContent = active ? '退出全屏' : '进入全屏';
    this.fullscreenState.textContent = !supported
      ? '当前浏览器不支持全屏' : active ? '当前为全屏模式' : '当前为窗口模式';
  }

  setMessage(message: string): void {
    this.status.textContent = message;
    this.status.hidden = message.length === 0;
  }

  destroy(): void {
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('change', this.onChange);
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('focusin', this.onFocusIn);
    this.root.remove();
  }

  private find<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing game UI element: ${selector}`);
    return element;
  }

  private findShopItem(id: ShopItemId): ShopItemElements {
    const prefix = `[data-item="${id}"]`;
    return {
      name: this.find(`${prefix} [data-shop-name]`),
      description: this.find(`${prefix} [data-shop-description]`),
      price: this.find(`${prefix} [data-shop-price]`),
      remaining: this.find(`${prefix} [data-shop-remaining]`),
      reason: this.find(`${prefix} [data-shop-reason]`),
      button: this.find(`${prefix} [data-action="buy"]`),
    };
  }

  private updateText(element: HTMLElement, text: string): void {
    if (element.textContent !== text) element.textContent = text;
  }

  private renderResult(run: RunSnapshot): void {
    const won = run.status === 'won';
    const completed = run.status === 'completed';
    this.updateText(this.resultTitle, completed ? '全部通关' : won ? '本关通过' : '挑战失败');
    const description = completed ? '5 关挑战完成，可以重新挑战。'
      : won ? `${run.levelName}已达成目标，前往商店准备下一关。`
      : run.lossReason === 'depleted' ? '物品已采集完，金额未达到目标。'
      : run.mode === 'endless' ? '时间耗尽，本次无尽挑战结束。' : '时间耗尽，金额未达到目标。';
    this.updateText(this.resultDescription, run.rewardNotice ? `${run.rewardNotice}。${description}` : description);
    this.updateText(this.resultScoreLabel, run.mode === 'endless' ? '本波金额' : '本关金额');
    this.updateText(this.resultScore, String(run.roundScore));
    this.updateText(this.resultTargetLabel, run.mode === 'endless' ? '到达波次' : '目标金额');
    this.updateText(this.resultTarget, run.target === null ? String(run.round) : String(run.target));
    this.updateText(this.resultTime, `${Math.ceil(run.timeRemaining)} 秒`);
    this.updateText(this.resultTotalLabel, run.mode === 'endless' ? '累计总分' : '购物余额');
    this.updateText(this.resultTotal, String(run.mode === 'endless' ? run.totalScore : run.wallet));
    this.enterShopButton.hidden = !won;
    this.resultRestart.hidden = won;
    this.updateText(this.resultRestart, completed ? '重新挑战'
      : run.mode === 'endless' ? '再来一局' : '重试本关');
  }

  private renderLevelIntro(run: RunSnapshot): void {
    this.updateText(this.introLevel, `第 ${run.levelIndex + 1} 关 · ${run.levelName}`);
    this.updateText(this.introTarget, `$${run.target ?? 0}`);
    this.updateText(this.introTime, `本关时间 ${Math.ceil(run.timeRemaining)} 秒`);
  }

  private renderShop(run: RunSnapshot): void {
    this.updateText(this.shopBalance, String(run.wallet));
    this.updateText(this.nextLevelLabel, `下一关：第 ${run.levelIndex + 2} 关`);
    this.updateText(this.shopInventory,
      `现有炸药 ${run.bombs} 枚 · 下一关力量药水${run.strengthQueued ? '已准备' : '未购买'}`);
    for (const offer of run.shopOffers) {
      const elements = this.shopItems[offer.id];
      this.updateText(elements.name, offer.name);
      this.updateText(elements.description, offer.description);
      this.updateText(elements.price, `${offer.price} 金币`);
      this.updateText(elements.remaining, `本次还可购买 ${offer.remaining} 次`);
      this.updateText(elements.reason, offer.canBuy ? '' : offer.disabledReason);
      elements.reason.hidden = offer.canBuy;
      elements.button.disabled = !offer.canBuy;
      elements.button.setAttribute('aria-label', `购买${offer.name}，${offer.price}金币`);
    }
  }

  private focusAction(action: string): void {
    // On small canvases a dialog can scroll; keep its newly focused action visible.
    this.find<HTMLButtonElement>(`[data-action="${action}"]`).focus();
  }

  private getActiveDialog(): HTMLElement | null {
    if (this.state?.screen === 'paused') return this.pauseDialog;
    if (this.state?.screen === 'settings') return this.settingsDialog;
    if (this.state?.screen === 'result') return this.resultDialog;
    if (this.state?.screen === 'shop') return this.shopDialog;
    if (this.state?.screen === 'level-intro') return this.levelIntro;
    return null;
  }

  private getFocusable(dialog: HTMLElement): HTMLElement[] {
    return Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
    )).filter((element) => !element.closest('[hidden]'));
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-action]');
    if (!button || button.disabled || !this.root.contains(button)) return;
    switch (button.dataset.action) {
      case 'level': this.actions.selectMode('level'); break;
      case 'endless': this.actions.selectMode('endless'); break;
      case 'start': this.actions.start(); break;
      case 'begin-level': this.actions.beginLevel(); break;
      case 'pause': this.actions.pause(); break;
      case 'resume': this.actions.resume(); break;
      case 'restart': this.actions.restart(); break;
      case 'result-restart': this.actions.restart(); break;
      case 'enter-shop': this.actions.enterShop(); break;
      case 'next-level': this.actions.nextLevel(); break;
      case 'buy': {
        const id = button.dataset.shopId;
        if (id === 'bomb' || id === 'strength') this.actions.buy(id);
        break;
      }
      case 'return-menu': this.actions.returnToMenu(); break;
      case 'menu-settings':
      case 'pause-settings': this.actions.openSettings(); break;
      case 'close-settings': this.actions.closeSettings(); break;
      case 'reset-settings': this.actions.resetSettings(); break;
      case 'fullscreen': this.actions.toggleFullscreen(); break;
    }
  };

  private readonly onChange = (event: Event): void => {
    if (event.target === this.hintsCheckbox) {
      this.actions.setShowHints(this.hintsCheckbox.checked);
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const dialog = this.getActiveDialog();
    if (event.key !== 'Tab' || !dialog) return;
    const focusable = this.getFocusable(dialog);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    const dialog = this.getActiveDialog();
    if (!dialog || !(event.target instanceof Node) || dialog.contains(event.target)) return;
    this.getFocusable(dialog)[0]?.focus({ preventScroll: true });
  };
}
