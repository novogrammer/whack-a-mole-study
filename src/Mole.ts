import Phaser from 'phaser'

const HIDDEN_OFFSET_Y = 80
const VISIBLE_OFFSET_Y = -50
const DISPLAY_SCALE = 0.75
const GROUND_COLOR = 0xf7f3ea

export class Mole {
  private readonly scene: Phaser.Scene
  private readonly container: Phaser.GameObjects.Container
  private readonly graphics: Phaser.GameObjects.Graphics
  private tapHandler: (() => void) | undefined

  constructor(scene: Phaser.Scene, x: number, holeY: number) {
    this.scene = scene
    this.container = scene.add.container(x, holeY).setScale(DISPLAY_SCALE).setDepth(holeY)
    const hole = scene.add.ellipse(0, 0, 166, 40, 0x594336)
    this.graphics = scene.add.graphics({ x: 0, y: HIDDEN_OFFSET_Y })
    this.drawMole(this.graphics)

    // 手前の地面で、穴より下のモグラを隠す。
    const foreground = scene.add.graphics()
    foreground.fillStyle(GROUND_COLOR)
    foreground.fillRect(-100, 4, 200, 160)
    foreground.fillEllipse(0, 10, 178, 20)
    this.container.add([hole, this.graphics, foreground])

    this.graphics.setInteractive({
      hitArea: new Phaser.Geom.Ellipse(0, 0, 120, 140),
      hitAreaCallback: (area: Phaser.Geom.Ellipse, localX: number, localY: number) => (
        localY + this.graphics.y < 0
        && Phaser.Geom.Ellipse.Contains(area, localX, localY)
      ),
      useHandCursor: true,
    })
    this.graphics.disableInteractive()
  }

  emerge(durationMs: number, onTap: () => void) {
    this.unregisterTap()
    this.scene.tweens.killTweensOf(this.graphics)
    this.graphics.setPosition(0, HIDDEN_OFFSET_Y).setScale(1)
    this.drawMole(this.graphics)
    this.tapHandler = onTap
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
    this.scene.tweens.killTweensOf(this.graphics)
    this.graphics.setY(HIDDEN_OFFSET_Y)
  }

  destroy() {
    this.unregisterTap()
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
    mole.fillStyle(0xa97852)
    mole.fillCircle(-38, -28, 16)
    mole.fillCircle(38, -28, 16)
    mole.fillEllipse(0, 0, 108, 128)
    mole.fillStyle(0xe9c49b)
    mole.fillEllipse(0, 7, 70, 42)
    mole.fillStyle(0x30251e)
    mole.lineStyle(3, 0x30251e)

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
