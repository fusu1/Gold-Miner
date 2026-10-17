import type { RunSnapshot } from '../game/runTypes';

export const EFFECT_FILES = {
  click: 'click.wav',
  launch: 'launch.wav',
  catch: 'catch.wav',
  collect: 'collect.wav',
  reward: 'reward.wav',
  explosion: 'explosion.wav',
  win: 'win.wav',
  lose: 'lose.wav',
} as const;
export type SoundCue = keyof typeof EFFECT_FILES;

/** Compare each fixed simulation step, so a low display frame rate cannot skip cues. */
export function gameplayCues(before: RunSnapshot, after: RunSnapshot): SoundCue[] {
  if (before.status !== 'playing') return [];
  if (after.status === 'lost') return ['lose'];
  if (after.status === 'won' || after.status === 'completed') return ['win'];
  if (before.game.hook.phase === 'launching' && after.game.hook.phase === 'returning-loaded') return ['catch'];
  const id = before.game.hook.carriedItemId;
  if (before.game.hook.phase === 'returning-loaded' && id
    && after.game.hook.phase === 'swinging' && !after.game.items.some(item => item.id === id)) {
    const item = before.game.items.find(item => item.id === id);
    return [item?.kind === 'mystery-bag' ? 'reward' : 'collect'];
  }
  return [];
}
