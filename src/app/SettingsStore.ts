export interface UserSettings {
  readonly showHints: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = Object.freeze({ showHints: true });

const STORAGE_KEY = 'gold-miner.settings.v1';
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

function getBrowserStorage(): SettingsStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Small, versioned preferences store. Storage is optional and best effort. */
export class SettingsStore {
  private readonly storage: SettingsStorage | null;
  private settings: UserSettings = { ...DEFAULT_SETTINGS };

  constructor(storage?: SettingsStorage | null) {
    this.storage = storage === undefined ? getBrowserStorage() : storage;
    this.load();
  }

  getSnapshot(): UserSettings {
    return { ...this.settings };
  }

  setShowHints(visible: boolean): void {
    this.settings = { showHints: visible };
    this.save();
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }

  private load(): void {
    try {
      const stored = this.storage?.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed) &&
        'showHints' in parsed &&
        typeof parsed.showHints === 'boolean'
      ) {
        this.settings = { showHints: parsed.showHints };
      }
    } catch {
      // Missing permissions, unavailable storage and damaged JSON use defaults.
    }
  }

  private save(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify({ showHints: this.settings.showHints }));
    } catch {
      // Preferences still work for this visit when persistence is unavailable.
    }
  }
}
