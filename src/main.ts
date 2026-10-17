import Phaser from 'phaser';
import { GAME_CONFIG } from './game/config';
import { GameScene } from './game/GameScene';
import './style.css';

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  backgroundColor: '#080602',
  scene: [GameScene],
  physics: undefined,
  render: { antialias: true, roundPixels: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // GameAudio owns the browser audio context; avoid creating a second Phaser mixer.
  audio: { noAudio: true },
  banner: false,
});

if (import.meta.hot) import.meta.hot.dispose(() => game.destroy(true));
