export interface KeyboardActions {
  readonly fire: () => void;
  readonly reset: () => void;
  readonly escape: () => void;
  readonly bomb: () => void;
}

/** Native input keeps browser key repeats and Phaser lifecycle concerns separate. */
export class KeyboardInput {
  private enabled = true;

  constructor(private readonly actions: KeyboardActions) {
    window.addEventListener('keydown', this.onKeyDown);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const isFire = event.code === 'ArrowDown' || event.code === 'Space';
    const isReset = event.code === 'KeyR';
    const isEscape = event.code === 'Escape';
    const isBomb = event.code === 'ArrowUp';
    if (!isFire && !isReset && !isEscape && !isBomb) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Escape stays available while a menu disables gameplay input.
    if (isEscape) {
      event.preventDefault();
      if (!event.repeat) this.actions.escape();
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement
      && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return;
    event.preventDefault();
    if (!this.enabled || event.repeat) return;
    if (isFire) this.actions.fire();
    else if (isBomb) this.actions.bomb();
    else this.actions.reset();
  };
}
