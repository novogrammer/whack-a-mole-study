import Phaser from 'phaser'
import { Challenge } from './Challenge'
import type { ChallengeContext } from './Challenge'
import { Mole } from './Mole'
import { drawGardenBackground } from './gardenBackground'
import { drawGardenExtras, drawGardenPlants, drawGardenStones, drawSignPosts } from './gardenDecorations'
import bgmUrl from './assets/audio/bgm.mp3?no-inline'
import emergeSoundUrl from './assets/audio/mole-emerge.mp3?no-inline'
import hitSoundUrl from './assets/audio/mole-hit.mp3?no-inline'
import { getIntroMessage, getPlayStage, INTRO_DURATION_MS } from './playTimeline'
import type { PlayStage } from './playTimeline'
import { HIT_EFFECT_ASSETS } from './HitEffect'
import type { GameUI } from './GameUI'
import { generateChallengeSchedule } from './generateChallengeSchedule'
import { CHALLENGE_RHYTHM, RHYTHM_DURATION_MS, RHYTHM_STEP_DURATION_MS } from './challengeRhythm'

const MOVE_DURATION_MS = 150
const HOLD_DURATION_MS = 1_000
const HIT_SQUASH_DURATION_MS = 90
const HIT_HOLD_DURATION_MS = 120

const MOLE_POSITIONS = Array.from({ length: 9 }, (_, index) => ({
  x: 62.5 + (index % 3) * 125,
  y: 112 + 145 + Math.floor(index / 3) * 75,
}))

export class ChallengeScene extends Phaser.Scene implements ChallengeContext {
  private readonly ui: GameUI
  private bgm!: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound
  private stage: PlayStage | undefined
  private score = 0
  private moles: Mole[] = []
  private challenges: Challenge[] = []
  private playStartedAtMs: number | undefined

  constructor(ui: GameUI) {
    super('challenge')
    this.ui = ui
  }

  preload() {
    this.load.audio('bgm', bgmUrl)
    this.load.audio('mole-emerge', emergeSoundUrl)
    this.load.audio('mole-hit', hitSoundUrl)
    for (const asset of HIT_EFFECT_ASSETS) this.load.svg(asset.key, asset.url)
  }

  create() {
    // 描画は750×1200px、ゲーム内の座標は375×600px基準を保つ。
    this.cameras.main.setOrigin(0, 0).setZoom(this.scale.width / 375)
    drawGardenBackground(this)
    drawSignPosts(this)
    drawGardenPlants(this)
    this.moles = MOLE_POSITIONS.map(({ x, y }) => new Mole(this, x, y))
    drawGardenStones(this, MOLE_POSITIONS)
    drawGardenExtras(this)
    this.challenges = []
    this.playStartedAtMs = undefined
    this.stage = undefined
    this.bgm = this.sound.add('bgm', { loop: false }) as typeof this.bgm
    this.bgm.on(Phaser.Sound.Events.PLAY, () => {
      this.playStartedAtMs = this.time.now
      this.update()
    })
    const playMusic = () => this.bgm.play({ seek: 0 })

    const playChallenge = () => {
      if (this.playStartedAtMs !== undefined || this.stage === 'intro') return

      this.challenges = this.createChallenges()
      this.score = 0
      this.stage = 'intro'
      this.ui.showIntro()
      this.bgm.stop()
      if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, playMusic)
      else playMusic()
    }

    this.ui.showReady()
    const unsubscribeStart = this.ui.onStart(playChallenge)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const mole of this.moles) mole.destroy()
      this.moles = []
      this.playStartedAtMs = undefined
      this.sound.off(Phaser.Sound.Events.UNLOCKED, playMusic)
      this.bgm.destroy()
      this.sound.stopByKey('mole-emerge')
      this.sound.stopByKey('mole-hit')
      unsubscribeStart()
    })
  }

  update() {
    const elapsedMs = this.getElapsedMs()
    if (elapsedMs === undefined) return

    const stage = getPlayStage(elapsedMs, RHYTHM_DURATION_MS)
    if (stage === 'intro') {
      this.ui.updateIntro(getIntroMessage(elapsedMs))
      return
    }

    if (stage === 'playing' && this.stage !== 'playing') {
      this.ui.showPlaying(RHYTHM_DURATION_MS)
    }
    const gameElapsedMs = elapsedMs - INTRO_DURATION_MS
    for (const challenge of this.challenges) challenge.onUpdate(gameElapsedMs)
    this.ui.updateRemainingTime(RHYTHM_DURATION_MS - gameElapsedMs)

    if (stage === 'ending' && this.stage !== 'ending') this.ui.showEnding()
    this.stage = stage
    if (stage === 'result') {
      this.playStartedAtMs = undefined
      this.ui.showResult(this.score)
    }
  }

  private getElapsedMs(): number | undefined {
    if (this.playStartedAtMs === undefined) return undefined
    if (this.bgm.isPlaying || this.bgm.isPaused) return this.bgm.seek * 1_000
    // 音源の長さには依存せず、結果画面へ進める。
    return this.time.now - this.playStartedAtMs
  }

  emergeMole(moleIndex: number, durationMs: number, onTap: (elapsedMs: number) => void) {
    this.sound.play('mole-emerge')
    this.moles[moleIndex].emerge(durationMs, () => {
      const elapsedMs = this.getElapsedMs()
      if (elapsedMs === undefined || elapsedMs < INTRO_DURATION_MS) return
      onTap(elapsedMs - INTRO_DURATION_MS)
    })
  }

  holdMole(moleIndex: number) {
    this.moles[moleIndex].hold()
  }

  showHitReaction(moleIndex: number, squashDurationMs: number, holdDurationMs: number) {
    this.sound.play('mole-hit')
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
