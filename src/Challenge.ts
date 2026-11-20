export type ChallengePhase = 'idle' | 'emerging' | 'waiting' | 'returning' | 'completed'

export interface ChallengeContext {
  emergeMole(durationMs: number): void
  holdMole(): void
  showHitReaction(squashDurationMs: number, holdDurationMs: number): void
  returnMole(durationMs: number): void
  hideMole(): void
}

export interface ChallengeParams {
  startAtMs: number
  moveDurationMs: number
  holdDurationMs: number
  hitSquashDurationMs: number
  hitHoldDurationMs: number
}

export class Challenge {
  private readonly context: ChallengeContext
  private readonly params: Readonly<ChallengeParams>
  private currentPhase: ChallengePhase = 'idle'
  private hitRegistered = false
  private nextTransitionAtMs: number
  private returnProgress = 1

  constructor(context: ChallengeContext, params: ChallengeParams) {
    this.context = context
    this.params = { ...params }
    this.nextTransitionAtMs = params.startAtMs
  }

  get phase(): ChallengePhase {
    return this.currentPhase
  }

  get isHit(): boolean {
    return this.hitRegistered
  }

  onUpdate(elapsedMs: number) {
    // フレーム間隔が空いた場合も、経過時間に追いつくまで進める。
    while (this.currentPhase !== 'completed' && elapsedMs >= this.nextTransitionAtMs) {
      if (this.hitRegistered
        && (this.currentPhase === 'emerging' || this.currentPhase === 'waiting')) {
        this.beginReturning()
        continue
      }

      switch (this.currentPhase) {
        case 'idle':
          this.currentPhase = 'emerging'
          this.nextTransitionAtMs += this.params.moveDurationMs
          this.context.emergeMole(this.params.moveDurationMs)
          break

        case 'emerging':
          this.currentPhase = 'waiting'
          this.nextTransitionAtMs += this.params.holdDurationMs
          this.context.holdMole()
          break

        case 'waiting':
          this.beginReturning()
          break

        case 'returning':
          this.currentPhase = 'completed'
          this.context.hideMole()
          break
      }
    }
  }

  canHit(): boolean {
    return !this.hitRegistered
      && (this.currentPhase === 'emerging' || this.currentPhase === 'waiting')
  }

  onTap(elapsedMs: number): boolean {
    // 入力時点の時間で判定し、帰還開始後の入力を受け付けない。
    this.onUpdate(elapsedMs)
    if (!this.canHit()) return false

    this.hitRegistered = true
    this.returnProgress = this.currentPhase === 'emerging'
      ? (elapsedMs - this.params.startAtMs) / this.params.moveDurationMs
      : 1
    this.nextTransitionAtMs = elapsedMs
      + this.params.hitSquashDurationMs * 2 + this.params.hitHoldDurationMs
    this.context.showHitReaction(
      this.params.hitSquashDurationMs,
      this.params.hitHoldDurationMs,
    )
    return true
  }

  private beginReturning() {
    const durationMs = this.params.moveDurationMs * this.returnProgress
    this.currentPhase = 'returning'
    this.nextTransitionAtMs += durationMs
    this.context.returnMole(durationMs)
  }
}
