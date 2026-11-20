import type { ChallengeParams } from './Challenge'

type ChallengeTiming = Omit<ChallengeParams, 'startAtMs' | 'moleIndex'>

interface ScheduleOptions {
  playDurationMs: number
  moleCount: number
  challengeCount: number
  timing: ChallengeTiming
}

export function getReservationDurationMs(timing: ChallengeTiming): number {
  return timing.moveDurationMs * 2 + timing.holdDurationMs
    + timing.hitSquashDurationMs * 2 + timing.hitHoldDurationMs
}

export function generateChallengeSchedule(
  options: ScheduleOptions,
  random: () => number = Math.random,
): ChallengeParams[] {
  const { playDurationMs, moleCount, challengeCount, timing } = options
  const positiveValues = [playDurationMs, moleCount, timing.moveDurationMs]
  const nonnegativeValues = [
    challengeCount, timing.holdDurationMs,
    timing.hitSquashDurationMs, timing.hitHoldDurationMs,
  ]
  if (positiveValues.some(value => !Number.isSafeInteger(value) || value <= 0)
    || nonnegativeValues.some(value => !Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError('Schedule values must be integers in the supported range.')
  }

  const reservationDurationMs = getReservationDurationMs(timing)
  const capacityPerMole = Math.floor(playDurationMs / reservationDurationMs)
  if (challengeCount > capacityPerMole * moleCount) {
    throw new RangeError('The requested challenges do not fit in the play duration.')
  }

  const counts = Array<number>(moleCount).fill(0)
  const availableMoles = Array.from({ length: moleCount }, (_, index) => index)
  for (let i = 0; i < challengeCount; i++) {
    const candidateIndex = Math.floor(random() * availableMoles.length)
    const moleIndex = availableMoles[candidateIndex]
    counts[moleIndex]++
    if (counts[moleIndex] === capacityPerMole) availableMoles.splice(candidateIndex, 1)
  }

  const schedule: ChallengeParams[] = []
  counts.forEach((count, moleIndex) => {
    const slackMs = playDurationMs - count * reservationDurationMs
    // count個の切れ目で、余白を開始前・各予約間・終了後のcount+1区間に分ける。
    const cuts = Array.from({ length: count }, () => Math.floor(random() * (slackMs + 1)))
      .sort((a, b) => a - b)
    let cursorMs = 0
    let previousCutMs = 0
    for (const cutMs of cuts) {
      cursorMs += cutMs - previousCutMs
      schedule.push({ ...timing, moleIndex, startAtMs: cursorMs })
      cursorMs += reservationDurationMs
      previousCutMs = cutMs
    }
  })

  // 大きな時間更新でも、同じマスの前のチャレンジを先に完了させる。
  return schedule.sort((a, b) => a.startAtMs - b.startAtMs || a.moleIndex - b.moleIndex)
}
