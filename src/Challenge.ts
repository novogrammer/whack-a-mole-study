export type ChallengePhase = 'idle' | 'emerging' | 'waiting' | 'returning' | 'completed'

export interface ChallengeParams {
  startAtMs: number
  moveDurationMs: number
  holdDurationMs: number
}

export class Challenge {
  readonly params: Readonly<ChallengeParams>
  private currentPhase: ChallengePhase = 'idle'
  private hitRegistered = false

  constructor(params: ChallengeParams) {
    this.params = { ...params }
  }

  get phase(): ChallengePhase {
    return this.currentPhase
  }

  get isHit(): boolean {
    return this.hitRegistered
  }

  update(elapsedMs: number) {
    if (this.currentPhase === 'idle' && elapsedMs >= this.params.startAtMs) {
      this.currentPhase = 'emerging'
    }
  }

  canHit(): boolean {
    return !this.hitRegistered
      && (this.currentPhase === 'emerging' || this.currentPhase === 'waiting')
  }

  hit(): boolean {
    if (!this.canHit()) return false

    this.hitRegistered = true
    return true
  }

  finishEmerging() {
    if (this.currentPhase === 'emerging' && !this.hitRegistered) {
      this.currentPhase = 'waiting'
    }
  }

  finishWaiting() {
    if (this.currentPhase === 'waiting' && !this.hitRegistered) {
      this.currentPhase = 'returning'
    }
  }

  finishHitReaction() {
    if (this.hitRegistered
      && (this.currentPhase === 'emerging' || this.currentPhase === 'waiting')) {
      this.currentPhase = 'returning'
    }
  }

  finishReturning() {
    if (this.currentPhase === 'returning') {
      this.currentPhase = 'completed'
    }
  }
}
