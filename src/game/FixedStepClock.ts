/** Caps long stalls and clears residual time whenever the page loses focus. */
export class FixedStepClock {
  private accumulator = 0;

  constructor(
    private readonly stepSeconds: number,
    private readonly maxFrameSeconds: number,
  ) {}

  advance(deltaMilliseconds: number, step: (seconds: number) => void): void {
    if (!Number.isFinite(deltaMilliseconds) || deltaMilliseconds <= 0) return;
    this.accumulator += Math.min(deltaMilliseconds / 1000, this.maxFrameSeconds);
    while (this.accumulator + 1e-10 >= this.stepSeconds) {
      step(this.stepSeconds);
      this.accumulator = Math.max(0, this.accumulator - this.stepSeconds);
    }
  }

  reset(): void {
    this.accumulator = 0;
  }
}
