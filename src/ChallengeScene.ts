import Phaser from 'phaser'
import { Challenge } from './Challenge'
import type { ChallengeParams, ChallengePhase } from './Challenge'

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
}]

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

    const createChallenges = () => CHALLENGE_PARAMS.map(params => new Challenge(params))
    let challenges = createChallenges()
    let playStartedAtMs: number | undefined
    let renderedPhase: ChallengePhase = 'idle'
    let renderedIsHit = false
    let holdTimer: Phaser.Time.TimerEvent | undefined

    const stopCurrentMotion = () => {
      holdTimer?.remove(false)
      holdTimer = undefined
      this.tweens.killTweensOf(mole)
    }

    const renderChallenge = (challenge: Challenge) => {
      if (renderedPhase === challenge.phase && renderedIsHit === challenge.isHit) return

      stopCurrentMotion()
      const hitStarted = !renderedIsHit && challenge.isHit
      renderedPhase = challenge.phase
      renderedIsHit = challenge.isHit

      if (hitStarted) {
        this.drawMole(mole, challenge.isHit)
        this.tweens.add({
          targets: mole,
          scaleX: 1.15,
          scaleY: 0.75,
          duration: HIT_SQUASH_DURATION_MS,
          hold: HIT_HOLD_DURATION_MS,
          yoyo: true,
          onComplete: () => {
            challenge.finishHitReaction()
            renderChallenge(challenge)
          },
        })
        return
      }

      switch (challenge.phase) {
        case 'idle':
          break

        case 'emerging':
          mole.setPosition(MOLE_X, HIDDEN_Y).setScale(1)
          this.drawMole(mole, challenge.isHit)
          this.tweens.add({
            targets: mole,
            y: VISIBLE_Y,
            duration: challenge.params.moveDurationMs,
            ease: 'Linear',
            onComplete: () => {
              challenge.finishEmerging()
              renderChallenge(challenge)
            },
          })
          break

        case 'waiting':
          holdTimer = this.time.delayedCall(challenge.params.holdDurationMs, () => {
            challenge.finishWaiting()
            renderChallenge(challenge)
          })
          break

        case 'returning': {
          const returnDurationMs = challenge.params.moveDurationMs
            * (HIDDEN_Y - mole.y) / (HIDDEN_Y - VISIBLE_Y)

          this.tweens.add({
            targets: mole,
            y: HIDDEN_Y,
            duration: returnDurationMs,
            ease: 'Linear',
            onComplete: () => {
              challenge.finishReturning()
              renderChallenge(challenge)
            },
          })
          break
        }

        case 'completed':
          if (challenges.every(item => item.phase === 'completed')) {
            playStartedAtMs = undefined
            this.startButton.textContent = 'もう一度'
            this.startButton.disabled = false
          }
          break
      }
    }

    const updateChallenges = () => {
      if (playStartedAtMs === undefined) return

      const elapsedMs = this.time.now - playStartedAtMs
      for (const challenge of challenges) {
        challenge.update(elapsedMs)
        renderChallenge(challenge)
      }
    }

    // 今回は進行表に1件、表示するモグラも1体。
    mole.setInteractive({
      hitArea: new Phaser.Geom.Ellipse(0, 0, 120, 140),
      hitAreaCallback: (area: Phaser.Geom.Ellipse, x: number, y: number) => (
        challenges[0].canHit()
        && y + mole.y < 300 && Phaser.Geom.Ellipse.Contains(area, x, y)
      ),
      useHandCursor: true,
    })

    mole.on('pointerdown', () => {
      const challenge = challenges[0]
      if (challenge.hit()) renderChallenge(challenge)
    })

    const playChallenge = () => {
      if (playStartedAtMs !== undefined) return

      if (challenges.every(challenge => challenge.phase === 'completed')) {
        challenges = createChallenges()
      }
      renderedPhase = 'idle'
      renderedIsHit = false
      this.startButton.disabled = true
      playStartedAtMs = this.time.now
      updateChallenges()
    }

    this.startButton.disabled = false
    this.startButton.addEventListener('click', playChallenge)
    this.events.on(Phaser.Scenes.Events.UPDATE, updateChallenges)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopCurrentMotion()
      mole.removeAllListeners('pointerdown')
      this.events.off(Phaser.Scenes.Events.UPDATE, updateChallenges)
      this.startButton.removeEventListener('click', playChallenge)
      this.startButton.disabled = true
    })
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
