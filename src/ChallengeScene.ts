import Phaser from 'phaser'

const MOVE_DURATION = 150
const HOLD_DURATION = 1_000
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
    mole.fillStyle(0xa97852)
    mole.fillCircle(-38, -28, 16)
    mole.fillCircle(38, -28, 16)
    mole.fillEllipse(0, 0, 108, 128)
    mole.fillStyle(0xe9c49b)
    mole.fillEllipse(0, 7, 70, 42)
    mole.fillStyle(0x30251e)
    mole.fillCircle(-19, -20, 5)
    mole.fillCircle(19, -20, 5)
    mole.fillEllipse(0, -2, 18, 12)
    mole.lineStyle(3, 0x30251e)
    mole.lineBetween(0, 4, 0, 15)
    mole.lineBetween(-7, 15, 7, 15)

    // 手前の地面で、穴より下のモグラを隠す。
    const foreground = this.add.graphics()
    foreground.fillStyle(GROUND_COLOR)
    foreground.fillRect(0, 304, 375, 71)
    foreground.fillEllipse(MOLE_X, 310, 178, 20)

    const playChallenge = () => {
      if (this.startButton.disabled) return

      this.startButton.disabled = true
      this.tweens.add({
        targets: mole,
        y: VISIBLE_Y,
        duration: MOVE_DURATION,
        ease: 'Linear',
        hold: HOLD_DURATION,
        yoyo: true,
        onComplete: () => {
          this.startButton.textContent = 'もう一度'
          this.startButton.disabled = false
        },
      })
    }

    this.startButton.disabled = false
    this.startButton.addEventListener('click', playChallenge)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.startButton.removeEventListener('click', playChallenge)
      this.startButton.disabled = true
    })
  }
}
