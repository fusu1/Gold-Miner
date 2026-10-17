import type { RunSnapshot } from '../game/runTypes';
import type { AppScreen } from '../app/AppState';
import './touch.css';

interface TouchActions {
  fire(): void;
  bomb(): void;
  pause(): void;
}

/** Native buttons share the scene's action guards; no synthetic keyboard events. */
export class TouchControls {
  private readonly root = document.createElement('div');
  private readonly fire: HTMLButtonElement;
  private readonly bomb: HTMLButtonElement;
  private readonly pause: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private readonly media = window.matchMedia('(any-pointer: coarse)');

  constructor(private readonly shell: HTMLElement, private readonly actions: TouchActions) {
    this.root.className = 'gm-touch-controls';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', '触屏操作');
    this.root.innerHTML = `
      <p class="gm-touch-hint">瞄准后点出钩 · 拖拽时可用炸药</p>
      <div class="gm-touch-buttons">
        <button type="button" data-touch="bomb" disabled>炸药 × 0</button>
        <button type="button" data-touch="pause">暂停</button>
        <button type="button" data-touch="fire">出钩 ↓</button>
      </div>`;
    this.fire = this.root.querySelector('[data-touch="fire"]')!;
    this.bomb = this.root.querySelector('[data-touch="bomb"]')!;
    this.pause = this.root.querySelector('[data-touch="pause"]')!;
    this.hint = this.root.querySelector('.gm-touch-hint')!;
    this.root.inert = true;
    shell.append(this.root);
    this.root.addEventListener('click', this.onClick);
    this.media.addEventListener('change', this.onDeviceChange);
    this.onDeviceChange();
  }

  get available(): boolean {
    return this.media.matches || navigator.maxTouchPoints > 0;
  }

  render(screen: AppScreen, run: RunSnapshot, suspended: boolean, showHints: boolean): void {
    const visible = screen === 'playing';
    this.root.classList.toggle('is-playing', visible);
    this.root.inert = !visible || suspended;
    this.root.setAttribute('aria-hidden', String(!visible));
    this.fire.disabled = suspended || run.status !== 'playing' || run.game.hook.phase !== 'swinging';
    this.bomb.disabled = suspended || run.bombs === 0 || run.game.hook.phase !== 'returning-loaded';
    this.pause.disabled = suspended;
    const label = `炸药 × ${run.bombs}`;
    if (this.bomb.textContent !== label) this.bomb.textContent = label;
    this.hint.style.opacity = showHints ? '1' : '0';
  }

  destroy(): void {
    this.media.removeEventListener('change', this.onDeviceChange);
    this.root.removeEventListener('click', this.onClick);
    this.root.remove();
    this.shell.classList.remove('gm-touch-device');
  }

  private readonly onDeviceChange = (): void => {
    this.shell.classList.toggle('gm-touch-device', this.available);
  };

  private readonly onClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element) || this.root.inert) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-touch]');
    if (!button || button.disabled) return;
    if (button === this.fire) this.actions.fire();
    else if (button === this.bomb) this.actions.bomb();
    else if (button === this.pause) this.actions.pause();
  };
}
