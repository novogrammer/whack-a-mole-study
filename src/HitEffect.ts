import type Phaser from 'phaser'
// PhaserのSVGローダーへdata URLを渡さないよう、Viteの埋め込みを無効にする。
import starUrl from './assets/fx/hit-star.svg?no-inline'
import raysUrl from './assets/fx/hit-rays.svg?no-inline'

export const HIT_EFFECT_ASSETS = [
  { key: 'hit-star', url: starUrl },
  { key: 'hit-rays', url: raysUrl },
] as const

const STAR_DURATION_MS = 100
const RAYS_DURATION_MS = 200

export class HitEffect {
  private readonly scene: Phaser.Scene
  private readonly star: Phaser.GameObjects.Image
  private readonly rays: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    // 穴の地面や他の行に隠れないよう、盤面より前面に描く。
    this.star = scene.add.image(0, 0, 'hit-star').setDepth(10_000).setVisible(false)
    this.rays = scene.add.image(0, 0, 'hit-rays').setDepth(10_000).setVisible(false)
  }

  play(x: number, y: number) {
    this.stop()
    this.star.setPosition(x, y).setScale(0.56).setAlpha(1).setVisible(true)
    this.rays.setPosition(x, y).setScale(0.64).setAlpha(1)
    this.scene.tweens.add({
      targets: this.star,
      scale: 0.8,
      duration: STAR_DURATION_MS,
      onComplete: () => {
        this.star.setVisible(false)
        this.rays.setVisible(true)
        this.scene.tweens.add({
          targets: this.rays,
          scale: 1.44,
          alpha: 0,
          duration: RAYS_DURATION_MS,
          onComplete: () => this.rays.setVisible(false),
        })
      },
    })
  }

  stop() {
    this.scene.tweens.killTweensOf([this.star, this.rays])
    this.star.setVisible(false)
    this.rays.setVisible(false)
  }

  destroy() {
    this.stop()
    this.star.destroy()
    this.rays.destroy()
  }
}
