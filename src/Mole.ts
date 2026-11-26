import Phaser from 'phaser'
import { HitEffect } from './HitEffect'
import { getGardenPathY } from './gardenBackground'
import { COLORS } from './colors'

const HIDDEN_OFFSET_Y = 90
const VISIBLE_OFFSET_Y = -50
const DISPLAY_SCALE = 0.75

export class Mole {
  private readonly scene: Phaser.Scene
  private readonly container: Phaser.GameObjects.Container
  private readonly graphics: Phaser.GameObjects.Graphics
  private readonly hitEffect: HitEffect
  private lastTapPosition: Phaser.Math.Vector2 | undefined
  private tapHandler: ((pointer: Phaser.Input.Pointer) => void) | undefined

  constructor(scene: Phaser.Scene, x: number, holeY: number) {
    this.scene = scene
    this.container = scene.add.container(x, holeY).setScale(DISPLAY_SCALE).setDepth(holeY)
    const hole = scene.add.ellipse(0, 0, 166, 40, COLORS.garden.hole)
    this.graphics = scene.add.graphics({ x: 0, y: HIDDEN_OFFSET_Y })
    this.drawMole(this.graphics)

    // 穴と同じ幅の地面を重ね、隣の穴へはみ出さず下半分の輪郭を保つ。
    const foreground = scene.add.graphics()
    foreground.fillStyle(COLORS.garden.soil)
    foreground.beginPath()
    const frontEdge = hole.geom.getPoints(hole.smoothness)
      .slice(0, hole.smoothness / 2 + 1)
      .reverse()
    foreground.moveTo(-hole.width / 2, 0)
    for (const point of frontEdge) {
      foreground.lineTo(point.x - hole.displayOriginX, point.y - hole.displayOriginY)
    }
    foreground.lineTo(hole.width / 2, 260)
    foreground.lineTo(-hole.width / 2, 260)
    foreground.closePath()
    foreground.fillPath()

    // 手前の地面が道にかかる部分も、背景と同じ輪郭・色につなげる。
    const pathEdge = Array.from({ length: 33 }, (_, index) => {
      const localX = -hole.width / 2 + index / 32 * hole.width
      const localY = (getGardenPathY(x + localX * DISPLAY_SCALE) - holeY) / DISPLAY_SCALE
      return new Phaser.Math.Vector2(localX, Math.min(260, localY))
    })
    foreground.fillStyle(COLORS.garden.path)
    foreground.fillPoints([
      ...pathEdge,
      new Phaser.Math.Vector2(hole.width / 2, 260),
      new Phaser.Math.Vector2(-hole.width / 2, 260),
    ], true)
    this.container.add([hole, this.graphics, foreground])

    this.graphics.setInteractive({
      hitArea: new Phaser.Geom.Ellipse(0, 0, 120, 140),
      hitAreaCallback: (area: Phaser.Geom.Ellipse, localX: number, localY: number) => {
        const y = localY + this.graphics.y
        const isAboveGround = y < 0
        const isInsideHole = Phaser.Geom.Ellipse.Contains(
          hole.geom, localX + hole.displayOriginX, y + hole.displayOriginY,
        )
        return (isAboveGround || isInsideHole)
          && Phaser.Geom.Ellipse.Contains(area, localX, localY)
      },
      useHandCursor: true,
    })
    this.graphics.disableInteractive()
    this.hitEffect = new HitEffect(scene)
  }

  emerge(durationMs: number, onTap: () => void) {
    this.unregisterTap()
    this.hitEffect.stop()
    this.lastTapPosition = undefined
    this.scene.tweens.killTweensOf(this.graphics)
    this.graphics.setPosition(0, HIDDEN_OFFSET_Y).setScale(1)
    this.drawMole(this.graphics)
    this.tapHandler = pointer => {
      this.lastTapPosition = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
      onTap()
    }
    this.graphics.on('pointerdown', this.tapHandler)
    this.graphics.setInteractive()
    this.scene.tweens.add({
      targets: this.graphics,
      y: VISIBLE_OFFSET_Y,
      duration: durationMs,
      ease: 'Linear',
    })
  }

  hold() {
    this.scene.tweens.killTweensOf(this.graphics)
    this.graphics.setY(VISIBLE_OFFSET_Y)
  }

  showHitReaction(squashDurationMs: number, holdDurationMs: number) {
    this.unregisterTap()
    if (this.lastTapPosition) {
      this.hitEffect.play(this.lastTapPosition.x, this.lastTapPosition.y)
    }
    this.scene.tweens.killTweensOf(this.graphics)
    this.drawMole(this.graphics, true)
    this.scene.tweens.add({
      targets: this.graphics,
      scaleX: 1.15,
      scaleY: 0.75,
      duration: squashDurationMs,
      hold: holdDurationMs,
      yoyo: true,
    })
  }

  returnToHole(durationMs: number) {
    this.unregisterTap()
    this.scene.tweens.killTweensOf(this.graphics)
    this.graphics.setScale(1)
    this.scene.tweens.add({
      targets: this.graphics,
      y: HIDDEN_OFFSET_Y,
      duration: durationMs,
      ease: 'Linear',
    })
  }

  hide() {
    this.unregisterTap()
    this.hitEffect.stop()
    this.scene.tweens.killTweensOf(this.graphics)
    this.graphics.setY(HIDDEN_OFFSET_Y)
  }

  destroy() {
    this.unregisterTap()
    this.hitEffect.destroy()
    this.scene.tweens.killTweensOf(this.graphics)
    this.container.destroy()
  }

  private unregisterTap() {
    if (this.tapHandler) {
      this.graphics.off('pointerdown', this.tapHandler)
      this.tapHandler = undefined
    }
    // Scene終了時にはPhaserが先にGraphicsを破棄している場合がある。
    if (this.graphics.scene) this.graphics.disableInteractive()
  }

  private drawMole(mole: Phaser.GameObjects.Graphics, isHit = false) {
    mole.clear()
    mole.fillStyle(COLORS.mole.body)
    // 顔はそのままに、下へ続く胴体を先に描く。
    mole.fillEllipse(0, 65, 96, 150)
    mole.fillCircle(-38, -28, 16)
    mole.fillCircle(38, -28, 16)
    mole.fillEllipse(0, 0, 108, 128)
    mole.fillStyle(COLORS.mole.muzzle)
    mole.fillEllipse(0, 7, 70, 42)
    mole.fillStyle(COLORS.mole.face)
    mole.lineStyle(3, COLORS.mole.face)

    if (isHit) {
      for (const eyeX of [-19, 19]) {
        mole.lineBetween(eyeX - 5, -25, eyeX + 5, -15)
        mole.lineBetween(eyeX - 5, -15, eyeX + 5, -25)
      }
      mole.fillEllipse(0, 16, 12, 16)
    } else {
      mole.fillCircle(-19, -20, 5)
      mole.fillCircle(19, -20, 5)
      mole.lineBetween(0, 4, 0, 15)
      mole.lineBetween(-7, 15, 7, 15)
    }

    mole.fillEllipse(0, -2, 18, 12)
  }
}
