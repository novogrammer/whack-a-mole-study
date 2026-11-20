import Phaser from 'phaser'
import { Challenge } from './Challenge'
import type { ChallengeContext, ChallengeParams } from './Challenge'

const MOVE_DURATION_MS = 150
const HOLD_DURATION_MS = 1_000
const HIT_SQUASH_DURATION_MS = 90
const HIT_HOLD_DURATION_MS = 120
const MOLE_X = 187.5
const HIDDEN_Y = 380
const VISIBLE_Y = 250
const GROUND_COLOR = 0xf7f3ea

const CHALLENGE_PARAMS: ChallengeParams[] = [{
  startAtMs: 0,
  moveDurationMs: MOVE_DURATION_MS,
  holdDurationMs: HOLD_DURATION_MS,
  hitSquashDurationMs: HIT_SQUASH_DURATION_MS,
  hitHoldDurationMs: HIT_HOLD_DURATION_MS,
}]

export class ChallengeScene extends Phaser.Scene implements ChallengeContext {
  private readonly startButton: HTMLButtonElement
  private mole!: Phaser.GameObjects.Graphics
  private challenges: Challenge[] = []
  private playStartedAtMs: number | undefined

  constructor(startButton: HTMLButtonElement) {
    super('challenge')
    this.startButton = startButton
  }

  create() {
    this.add.ellipse(MOLE_X, 300, 166, 40, 0x594336)

    const mole = this.add.graphics({ x: MOLE_X, y: HIDDEN_Y })
    this.mole = mole
    this.drawMole(mole)

    // 手前の地面で、穴より下のモグラを隠す。
    const foreground = this.add.graphics()
    foreground.fillStyle(GROUND_COLOR)
    foreground.fillRect(0, 304, 375, 71)
    foreground.fillEllipse(MOLE_X, 310, 178, 20)

    this.challenges = this.createChallenges()
    this.playStartedAtMs = undefined

    // 今回は進行表に1件、表示するモグラも1体。
    mole.setInteractive({
      hitArea: new Phaser.Geom.Ellipse(0, 0, 120, 140),
      hitAreaCallback: (area: Phaser.Geom.Ellipse, x: number, y: number) => (
        this.challenges[0].canHit()
        && y + mole.y < 300 && Phaser.Geom.Ellipse.Contains(area, x, y)
      ),
      useHandCursor: true,
    })

    mole.on('pointerdown', () => {
      if (this.playStartedAtMs === undefined) return
      this.challenges[0].onTap(this.time.now - this.playStartedAtMs)
    })

    const playChallenge = () => {
      if (this.playStartedAtMs !== undefined) return

      if (this.challenges.every(challenge => challenge.phase === 'completed')) {
        this.challenges = this.createChallenges()
      }
      this.startButton.disabled = true
      this.playStartedAtMs = this.time.now
      this.update()
    }

    this.startButton.disabled = false
    this.startButton.addEventListener('click', playChallenge)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killTweensOf(mole)
      this.playStartedAtMs = undefined
      mole.removeAllListeners('pointerdown')
      this.startButton.removeEventListener('click', playChallenge)
      this.startButton.disabled = true
    })
  }

  update() {
    if (this.playStartedAtMs === undefined) return

    const elapsedMs = this.time.now - this.playStartedAtMs
    for (const challenge of this.challenges) challenge.onUpdate(elapsedMs)

    if (this.challenges.every(challenge => challenge.phase === 'completed')) {
      this.playStartedAtMs = undefined
      this.startButton.textContent = 'もう一度'
      this.startButton.disabled = false
    }
  }

  emergeMole(durationMs: number) {
    this.tweens.killTweensOf(this.mole)
    this.mole.setPosition(MOLE_X, HIDDEN_Y).setScale(1)
    this.drawMole(this.mole)
    this.tweens.add({
      targets: this.mole,
      y: VISIBLE_Y,
      duration: durationMs,
      ease: 'Linear',
    })
  }

  holdMole() {
    this.tweens.killTweensOf(this.mole)
    this.mole.setY(VISIBLE_Y)
  }

  showHitReaction(squashDurationMs: number, holdDurationMs: number) {
    this.tweens.killTweensOf(this.mole)
    this.drawMole(this.mole, true)
    this.tweens.add({
      targets: this.mole,
      scaleX: 1.15,
      scaleY: 0.75,
      duration: squashDurationMs,
      hold: holdDurationMs,
      yoyo: true,
    })
  }

  returnMole(durationMs: number) {
    this.tweens.killTweensOf(this.mole)
    this.mole.setScale(1)
    this.tweens.add({
      targets: this.mole,
      y: HIDDEN_Y,
      duration: durationMs,
      ease: 'Linear',
    })
  }

  hideMole() {
    this.tweens.killTweensOf(this.mole)
    this.mole.setY(HIDDEN_Y)
  }

  private createChallenges() {
    return CHALLENGE_PARAMS.map(params => new Challenge(this, params))
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
