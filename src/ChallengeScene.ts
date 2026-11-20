import Phaser from 'phaser'
import { Challenge } from './Challenge'
import type { ChallengeContext } from './Challenge'
import { Mole } from './Mole'
import type { GameUI } from './GameUI'
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
  private readonly ui: GameUI
  private score = 0
  private moles: Mole[] = []
  private challenges: Challenge[] = []
  private playStartedAtMs: number | undefined

  constructor(ui: GameUI) {
    super('challenge')
    this.ui = ui
  }

  create() {
    // 描画は750px、ゲーム内の座標は375px基準を保つ。
    this.cameras.main.setOrigin(0, 0).setZoom(this.scale.width / 375)
    this.moles = MOLE_POSITIONS.map(({ x, y }) => new Mole(this, x, y))
    this.challenges = []
    this.playStartedAtMs = undefined

    const playChallenge = () => {
      if (this.playStartedAtMs !== undefined) return

      this.challenges = this.createChallenges()
      this.score = 0
      this.ui.showPlaying(RHYTHM_DURATION_MS)
      this.playStartedAtMs = this.time.now
      this.update()
    }

    this.ui.showReady()
    const unsubscribeStart = this.ui.onStart(playChallenge)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const mole of this.moles) mole.destroy()
      this.moles = []
      this.playStartedAtMs = undefined
      unsubscribeStart()
    })
  }

  update() {
    if (this.playStartedAtMs === undefined) return

    const elapsedMs = this.time.now - this.playStartedAtMs
    for (const challenge of this.challenges) challenge.onUpdate(elapsedMs)
    this.ui.updateRemainingTime(RHYTHM_DURATION_MS - elapsedMs)

    if (elapsedMs >= RHYTHM_DURATION_MS
      && this.challenges.every(challenge => challenge.phase === 'completed')) {
      this.playStartedAtMs = undefined
      this.ui.showResult(this.score)
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

  addScore(points: number) {
    if (this.playStartedAtMs === undefined) return
    this.score += points
    this.ui.updateScore(this.score)
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
