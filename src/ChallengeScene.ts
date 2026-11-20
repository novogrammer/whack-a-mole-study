import Phaser from 'phaser'
import { Challenge } from './Challenge'
import type { ChallengeContext } from './Challenge'
import { Mole } from './Mole'
import { generateChallengeSchedule } from './generateChallengeSchedule'
import { CHALLENGE_RHYTHM, RHYTHM_DURATION_MS, RHYTHM_STEP_DURATION_MS } from './challengeRhythm'

const MOVE_DURATION_MS = 150
const HOLD_DURATION_MS = 1_000
const HIT_SQUASH_DURATION_MS = 90
const HIT_HOLD_DURATION_MS = 120

const MOLE_POSITIONS = Array.from({ length: 9 }, (_, index) => ({
  x: 62.5 + (index % 3) * 125,
  y: 145 + Math.floor(index / 3) * 75,
}))

export class ChallengeScene extends Phaser.Scene implements ChallengeContext {
  private readonly startButton: HTMLButtonElement
  private moles: Mole[] = []
  private challenges: Challenge[] = []
  private playStartedAtMs: number | undefined

  constructor(startButton: HTMLButtonElement) {
    super('challenge')
    this.startButton = startButton
  }

  create() {
    this.moles = MOLE_POSITIONS.map(({ x, y }) => new Mole(this, x, y))
    this.challenges = []
    this.playStartedAtMs = undefined

    const playChallenge = () => {
      if (this.playStartedAtMs !== undefined) return

      this.challenges = this.createChallenges()
      this.startButton.disabled = true
      this.playStartedAtMs = this.time.now
      this.update()
    }

    this.startButton.disabled = false
    this.startButton.addEventListener('click', playChallenge)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const mole of this.moles) mole.destroy()
      this.moles = []
      this.playStartedAtMs = undefined
      this.startButton.removeEventListener('click', playChallenge)
      this.startButton.disabled = true
    })
  }

  update() {
    if (this.playStartedAtMs === undefined) return

    const elapsedMs = this.time.now - this.playStartedAtMs
    for (const challenge of this.challenges) challenge.onUpdate(elapsedMs)

    if (elapsedMs >= RHYTHM_DURATION_MS
      && this.challenges.every(challenge => challenge.phase === 'completed')) {
      this.playStartedAtMs = undefined
      this.startButton.textContent = 'もう一度'
      this.startButton.disabled = false
    }
  }

  emergeMole(moleIndex: number, durationMs: number, onTap: (elapsedMs: number) => void) {
    this.moles[moleIndex].emerge(durationMs, () => {
      if (this.playStartedAtMs === undefined) return
      onTap(this.time.now - this.playStartedAtMs)
    })
  }

  holdMole(moleIndex: number) {
    this.moles[moleIndex].hold()
  }

  showHitReaction(moleIndex: number, squashDurationMs: number, holdDurationMs: number) {
    this.moles[moleIndex].showHitReaction(squashDurationMs, holdDurationMs)
  }

  returnMole(moleIndex: number, durationMs: number) {
    this.moles[moleIndex].returnToHole(durationMs)
  }

  hideMole(moleIndex: number) {
    this.moles[moleIndex].hide()
  }

  private createChallenges() {
    const challengeParams = generateChallengeSchedule({
      rhythm: CHALLENGE_RHYTHM,
      stepDurationMs: RHYTHM_STEP_DURATION_MS,
      moleCount: this.moles.length,
      timing: {
        moveDurationMs: MOVE_DURATION_MS,
        holdDurationMs: HOLD_DURATION_MS,
        hitSquashDurationMs: HIT_SQUASH_DURATION_MS,
        hitHoldDurationMs: HIT_HOLD_DURATION_MS,
      },
    })
    return challengeParams.map(params => new Challenge(this, params))
  }
}
