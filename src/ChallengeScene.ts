import Phaser from 'phaser'

const MOVE_DURATION_MS = 150
const HOLD_DURATION_MS = 1_000
const HIT_SQUASH_DURATION_MS = 90
const HIT_HOLD_DURATION_MS = 120
const MOLE_X = 187.5
const HIDDEN_Y = 380
const VISIBLE_Y = 250
const GROUND_COLOR = 0xf7f3ea

export class ChallengeScene extends Phaser.Scene {
  private readonly startButton: HTMLButtonElement

  constructor(startButton: HTMLButtonElement) {
    super('challenge')
    this.startButton = startButton
  }

  create() {
    this.add.ellipse(MOLE_X, 300, 166, 40, 0x594336)

    const mole = this.add.graphics({ x: MOLE_X, y: HIDDEN_Y })
    this.drawMole(mole)

    // 手前の地面で、穴より下のモグラを隠す。
    const foreground = this.add.graphics()
    foreground.fillStyle(GROUND_COLOR)
    foreground.fillRect(0, 304, 375, 71)
    foreground.fillEllipse(MOLE_X, 310, 178, 20)

    let canHit = false

    const completeChallenge = () => {
      canHit = false
      this.startButton.textContent = 'もう一度'
      this.startButton.disabled = false
    }

    mole.setInteractive({
      hitArea: new Phaser.Geom.Ellipse(0, 0, 120, 140),
      hitAreaCallback: (area: Phaser.Geom.Ellipse, x: number, y: number) => (
        canHit && y + mole.y < 300 && Phaser.Geom.Ellipse.Contains(area, x, y)
      ),
      useHandCursor: true,
    })

    mole.on('pointerdown', () => {
      if (!canHit) return

      canHit = false
      this.tweens.killTweensOf(mole)
      this.drawMole(mole, true)
      this.tweens.add({
        targets: mole,
        scaleX: 1.15,
        scaleY: 0.75,
        duration: HIT_SQUASH_DURATION_MS,
        hold: HIT_HOLD_DURATION_MS,
        yoyo: true,
        onComplete: () => {
          // 出現途中で命中した場合も、残りの距離に合わせて帰還時間を決める。
          const returnDurationMs = MOVE_DURATION_MS
            * (HIDDEN_Y - mole.y) / (HIDDEN_Y - VISIBLE_Y)

          this.tweens.add({
            targets: mole,
            y: HIDDEN_Y,
            duration: returnDurationMs,
            ease: 'Linear',
            onComplete: completeChallenge,
          })
        },
      })
    })

    const playChallenge = () => {
      if (this.startButton.disabled) return

      this.startButton.disabled = true
      mole.setPosition(MOLE_X, HIDDEN_Y).setScale(1)
      this.drawMole(mole)
      canHit = true
      this.tweens.add({
        targets: mole,
        y: VISIBLE_Y,
        duration: MOVE_DURATION_MS,
        ease: 'Linear',
        hold: HOLD_DURATION_MS,
        yoyo: true,
        onYoyo: () => {
          canHit = false
        },
        onComplete: completeChallenge,
      })
    }

    this.startButton.disabled = false
    this.startButton.addEventListener('click', playChallenge)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      canHit = false
      this.startButton.removeEventListener('click', playChallenge)
      this.startButton.disabled = true
    })
  }

  private drawMole(mole: Phaser.GameObjects.Graphics, hit = false) {
    mole.clear()
    mole.fillStyle(0xa97852)
    mole.fillCircle(-38, -28, 16)
    mole.fillCircle(38, -28, 16)
    mole.fillEllipse(0, 0, 108, 128)
    mole.fillStyle(0xe9c49b)
    mole.fillEllipse(0, 7, 70, 42)
    mole.fillStyle(0x30251e)
    mole.lineStyle(3, 0x30251e)

    if (hit) {
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
