/** Simulation-time animation cursor; no renderer or wall-clock dependency. */
export class FrameAnimation {
  private elapsed = 0;
  readonly duration: number;

  constructor(private readonly frameSeconds: readonly number[], private readonly loop: boolean) {
    if (frameSeconds.length === 0 || frameSeconds.some((time) => !Number.isFinite(time) || time <= 0)) {
      throw new Error('Animation frames need finite positive durations.');
    }
    this.duration = frameSeconds.reduce((sum, time) => sum + time, 0);
  }

  advance(seconds: number, active = true): void {
    if (!active || !Number.isFinite(seconds) || seconds <= 0) return;
    const next = this.elapsed + seconds;
    this.elapsed = this.loop ? next % this.duration : Math.min(next, this.duration);
  }

  reset(): void { this.elapsed = 0; }

  get frameIndex(): number {
    let end = 0;
    for (let index = 0; index < this.frameSeconds.length - 1; index += 1) {
      end += this.frameSeconds[index];
      if (this.elapsed + 1e-9 < end) return index;
    }
    return this.frameSeconds.length - 1;
  }

  get finished(): boolean { return !this.loop && this.elapsed + 1e-9 >= this.duration; }
  get remaining(): number { return Math.max(0, this.duration - this.elapsed); }
}
