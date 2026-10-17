import Phaser from 'phaser';
import { GAME_CONFIG } from '../game/config';
import type { RunSnapshot } from '../game/runTypes';
import type { GameSnapshot } from '../game/types';
import { CLASSIC_ASSETS, CLASSIC_LAYOUT, ITEM_ASSETS, classicFrame } from './ClassicAssets';
import { FrameAnimation } from './FrameAnimation';
import { getCargoDisplayPosition, getItemDisplaySize } from './ItemPresentation';

const INK = '#79501b';
const FONT = '"KaiTi", "STKaiti", "Microsoft YaHei", sans-serif';
const PHASE_LABELS: Record<GameSnapshot['hook']['phase'], string> = {
  swinging: '瞄准后按 ↓ 或 Space 放钩',
  launching: '钩子发射中',
  'returning-empty': '空钩收回中',
  'returning-loaded': '正在拉回 · 按 ↑ 可使用炸药',
};
interface Explosion {
  readonly image: Phaser.GameObjects.Image;
  readonly animation: FrameAnimation;
}

/** Displays snapshots only; rules, positions and collision radii belong to the simulation. */
export class GameView {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly itemImages = new Map<string, Phaser.GameObjects.Image>();
  private readonly bagLabels = new Map<string, Phaser.GameObjects.Text>();
  private readonly rewardText: Phaser.GameObjects.Text;
  private readonly explosions: Explosion[] = [];
  private readonly rope: Phaser.GameObjects.Graphics;
  private readonly hook: Phaser.GameObjects.Image;
  private readonly miner: Phaser.GameObjects.Image;
  private readonly minerAnimation = new FrameAnimation(CLASSIC_LAYOUT.miner.frameSeconds, true);
  private pulling = false;
  private readonly scoreLabel: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly targetLabel: Phaser.GameObjects.Text;
  private readonly targetText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly bombText: Phaser.GameObjects.Text;
  private readonly strengthText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private readonly controlsText: Phaser.GameObjects.Text;
  private readonly pauseShade: Phaser.GameObjects.Graphics;
  private readonly pauseTitle: Phaser.GameObjects.Text;
  private readonly pauseHint: Phaser.GameObjects.Text;
  private paused = false;

  constructor(private readonly scene: Phaser.Scene) {
    const { width, height, surfaceY, origin } = GAME_CONFIG;
    this.own(scene.add.image(0, surfaceY, CLASSIC_ASSETS.mine.key).setOrigin(0)
      .setDisplaySize(width, height - surfaceY).setDepth(-10));
    const header = this.own(scene.add.graphics().setDepth(5));
    header.fillStyle(0xffd326).fillRect(0, 0, width, surfaceY);
    header.fillStyle(0x29469b);
    header.beginPath();
    header.moveTo(origin.x - 95, surfaceY);
    header.arc(origin.x, surfaceY, 95, Math.PI, Math.PI * 2);
    header.closePath();
    header.fillPath();
    header.lineStyle(2, 0xe2a13c);
    header.strokePath();

    this.miner = this.own(scene.add.image(CLASSIC_LAYOUT.miner.x, CLASSIC_LAYOUT.miner.baselineY,
      CLASSIC_ASSETS.minerIdle.key).setDepth(6));
    this.renderMiner();
    const winch = CLASSIC_ASSETS.winch;
    this.own(scene.add.image(origin.x, surfaceY - 2, winch.key, classicFrame(scene, winch))
      .setOrigin(0.5, 1).setDisplaySize(78, 56).setDepth(8));

    // Surface and moving line are separate, so the rope emerges beneath the winch.
    const surface = this.own(scene.add.graphics().setDepth(7));
    surface.fillStyle(0xe7ac69).fillRect(0, surfaceY - 6, width, 6);
    surface.fillStyle(0x8a542c).fillRect(0, surfaceY, width, 2);
    surface.fillStyle(0xffe0a0).fillRect(0, surfaceY - 6, width, 1);
    this.rope = this.own(scene.add.graphics().setDepth(3));
    const hook = CLASSIC_ASSETS.hookOpen;
    this.hook = this.own(scene.add.image(origin.x, origin.y + GAME_CONFIG.minLength,
      hook.key, classicFrame(scene, hook)).setDepth(4));

    this.scoreLabel = this.text(22, 12, '金钱：', 24);
    this.scoreText = this.text(106, 8, '$0', 30, '#079313').setFontStyle('bold');
    this.targetLabel = this.text(22, 56, '目标钱数：', 24);
    this.targetText = this.text(154, 53, '$300', 29, '#ee8c00').setFontStyle('bold')
      .setShadow(1.5, 2, '#895400', 0, false, true);
    this.text(814, 13, '时间：', 21);
    this.timeText = this.text(886, 8, '60', 30, '#ef6f0b').setFontStyle('bold');
    this.levelText = this.text(814, 58, '第 1 关', 24);
    const bomb = CLASSIC_ASSETS.dynamite;
    this.own(scene.add.image(622, 27, bomb.key, classicFrame(scene, bomb))
      .setDisplaySize(17, 24).setDepth(9));
    this.bombText = this.text(642, 14, '× 1', 19);
    this.strengthText = this.text(610, 65, '', 16, '#407b18');

    this.statusText = this.text(20, 670, '', 15, '#fff0c7').setDepth(4)
      .setShadow(1, 1, '#473017', 2, false, true);
    this.countText = this.text(width - 20, 670, '', 15, '#fff0c7').setOrigin(1, 0).setDepth(4)
      .setShadow(1, 1, '#473017', 2, false, true);
    this.controlsText = this.text(width / 2, 698,
      '↓ / Space 放钩     ↑ 丢炸药     R 重新开始     Esc 暂停', 14, '#fff0c7')
      .setOrigin(0.5, 0).setDepth(4).setShadow(1, 1, '#473017', 2, false, true);
    this.rewardText = this.text(width / 2, surfaceY + 40, '', 30, '#fff1a0')
      .setOrigin(0.5).setDepth(15).setBackgroundColor('#51320deb')
      .setPadding(14, 8).setVisible(false);

    this.pauseShade = this.own(scene.add.graphics().setDepth(30).setVisible(false));
    this.pauseShade.fillStyle(0x1c130a, 0.76).fillRect(0, surfaceY, width, height - surfaceY);
    this.pauseTitle = this.text(width / 2, height / 2 - 24, '已暂停', 36, '#ffe075')
      .setOrigin(0.5).setDepth(31).setVisible(false);
    this.pauseHint = this.text(width / 2, height / 2 + 30,
      '回到游戏窗口后自动继续', 19, '#fff1c7').setOrigin(0.5).setDepth(31).setVisible(false);
  }

  render(run: RunSnapshot): void {
    const snapshot = run.game;
    const ids = new Set(snapshot.items.map((item) => item.id));
    for (const [id, image] of this.itemImages) {
      if (!ids.has(id)) {
        image.destroy();
        this.itemImages.delete(id);
        this.bagLabels.get(id)?.destroy();
        this.bagLabels.delete(id);
      }
    }
    const cargoPosition = getCargoDisplayPosition(snapshot);
    for (const item of snapshot.items) {
      let image = this.itemImages.get(item.id);
      if (!image) {
        const asset = ITEM_ASSETS[item.kind];
        image = this.scene.add.image(item.x, item.y, asset.key, classicFrame(this.scene, asset)).setDepth(1);
        this.itemImages.set(item.id, image);
        if (item.kind === 'mystery-bag') {
          this.bagLabels.set(item.id, this.scene.add.text(0, 0, '?', {
            fontFamily: 'Arial, sans-serif', fontSize: `${item.radius}px`,
            fontStyle: 'bold', color: '#d95108', stroke: '#ffdc6a', strokeThickness: 1,
          }).setOrigin(0.5).setDepth(2));
        }
      }
      // Tight visible frames keep image diameters consistent with the existing collision radius.
      const size = getItemDisplaySize(item);
      image.setDisplaySize(size.width, size.height);
      const carried = item.id === snapshot.hook.carriedItemId && cargoPosition;
      image.setPosition(carried ? cargoPosition.x : item.x, carried ? cargoPosition.y : item.y);
      this.bagLabels.get(item.id)?.setPosition(image.x, image.y + size.height * 0.13);
    }
    this.renderHook(snapshot);
    const pulling = snapshot.hook.phase === 'returning-loaded';
    if (pulling !== this.pulling) this.minerAnimation.reset();
    this.pulling = pulling;
    this.renderMiner();

    this.updateText(this.scoreLabel, run.mode === 'endless' ? '总分：' : '金钱：');
    this.updateText(this.scoreText, `$${run.mode === 'endless' ? run.totalScore : run.roundScore}`);
    this.updateText(this.targetLabel, run.mode === 'endless' ? '当前波次：' : '目标钱数：');
    this.updateText(this.targetText, run.mode === 'endless' ? `${run.round}` : `$${run.target}`);
    this.updateText(this.timeText, `${Math.ceil(run.timeRemaining)}`);
    this.timeText.setColor(run.timeRemaining <= 10 ? '#d62813' : '#ef6f0b');
    this.updateText(this.levelText, run.mode === 'endless' ? `第 ${run.round} 波` : `第 ${run.levelIndex + 1} 关`);
    this.updateText(this.bombText, `× ${run.bombs}`);
    this.updateText(this.rewardText, run.rewardNotice ?? '');
    this.rewardText.setVisible(run.rewardNotice !== null);
    this.updateText(this.strengthText, run.strengthActive ? '力量药水生效' : '');
    this.updateText(this.countText, `剩余 ${snapshot.items.length} 件`);
    this.updateText(this.statusText, run.status === 'lost' ? '本次挑战已结束'
      : run.status === 'completed' ? '全部关卡已完成'
        : run.status === 'won' ? '已达成本关目标' : PHASE_LABELS[snapshot.hook.phase]);
  }

  /** Uses simulation time only; Phaser clocks/tweens cannot continue behind a pause. */
  advance(deltaSeconds: number, active = true): void {
    if (!active || this.paused || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    if (this.pulling) this.minerAnimation.advance(deltaSeconds);
    for (let index = this.explosions.length - 1; index >= 0; index -= 1) {
      const effect = this.explosions[index];
      effect.animation.advance(deltaSeconds);
      if (effect.animation.finished) {
        effect.image.destroy();
        this.explosions.splice(index, 1);
      } else {
        effect.image.setTexture(CLASSIC_ASSETS.explosion[effect.animation.frameIndex].key, '__BASE');
        effect.image.setAlpha(Math.min(1, effect.animation.remaining / CLASSIC_LAYOUT.explosion.finalFadeSeconds));
      }
    }
  }

  playExplosion(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.explosions.push({
      image: this.scene.add.image(x, y, CLASSIC_ASSETS.explosion[0].key, '__BASE')
        .setDisplaySize(CLASSIC_LAYOUT.explosion.canvasSize, CLASSIC_LAYOUT.explosion.canvasSize).setDepth(12),
      animation: new FrameAnimation(CLASSIC_LAYOUT.explosion.frameSeconds, false),
    });
  }

  resetEffects(): void {
    this.explosions.forEach((effect) => effect.image.destroy());
    this.explosions.length = 0;
    this.minerAnimation.reset();
    this.pulling = false;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.pauseShade.setVisible(paused);
    this.pauseTitle.setVisible(paused);
    this.pauseHint.setVisible(paused);
  }

  setHintsVisible(visible: boolean): void {
    this.controlsText.setVisible(visible);
    this.statusText.setVisible(visible);
  }

  destroy(): void {
    this.resetEffects();
    this.itemImages.forEach((image) => image.destroy());
    this.itemImages.clear();
    this.bagLabels.forEach((label) => label.destroy());
    this.bagLabels.clear();
    this.objects.forEach((object) => object.destroy());
  }

  private renderMiner(): void {
    const layout = CLASSIC_LAYOUT.miner;
    const index = this.minerAnimation.frameIndex;
    const asset = this.pulling ? CLASSIC_ASSETS.minerPull[index] : CLASSIC_ASSETS.minerIdle;
    const anchor = this.pulling ? layout.pullAnchor : layout.idleAnchor;
    this.miner.setTexture(asset.key, '__BASE').setOrigin(anchor.x, anchor.y)
      .setDisplaySize(layout.canvasSize, layout.canvasSize)
      .setPosition(layout.x, layout.baselineY + (this.pulling ? layout.pullOffsetY[index] * layout.canvasSize : 0));
  }

  private renderHook(snapshot: GameSnapshot): void {
    const { angle, position, carriedItemId } = snapshot.hook;
    const asset = carriedItemId ? CLASSIC_ASSETS.hookClosed : CLASSIC_ASSETS.hookOpen;
    const anchor = carriedItemId ? CLASSIC_LAYOUT.hook.closedAnchor : CLASSIC_LAYOUT.hook.openAnchor;
    this.hook.setTexture(asset.key, classicFrame(this.scene, asset)).setOrigin(anchor.x, anchor.y)
      .setScale(CLASSIC_LAYOUT.hook.height / this.hook.height)
      .setPosition(position.x, position.y).setRotation(-angle);
    const attachment = CLASSIC_LAYOUT.hook.attachmentFromTip;
    this.rope.clear().lineStyle(2, 0x494532, 1).lineBetween(
      GAME_CONFIG.origin.x, GAME_CONFIG.origin.y,
      position.x - Math.sin(angle) * attachment,
      position.y - Math.cos(angle) * attachment,
    );
  }

  private own<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private text(x: number, y: number, value: string, size: number, color = INK): Phaser.GameObjects.Text {
    return this.own(this.scene.add.text(x, y, value, {
      fontFamily: FONT, fontSize: `${size}px`, color, padding: { top: 2, bottom: 2 },
    }).setDepth(9));
  }

  private updateText(text: Phaser.GameObjects.Text, value: string): void {
    if (text.text !== value) text.setText(value);
  }
}
