import type { ChallengeParams } from './Challenge'

type ChallengeTiming = Omit<ChallengeParams, 'startAtMs' | 'moleIndex'>

interface ScheduleOptions {
  rhythm: readonly string[]
  stepDurationMs: number
  moleCount: number
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
  const { rhythm, stepDurationMs, moleCount, timing } = options
  const steps = rhythm.join('').replace(/\s/g, '')
  const positiveValues = [stepDurationMs, moleCount, timing.moveDurationMs]
  const nonnegativeValues = [
    timing.holdDurationMs, timing.hitSquashDurationMs, timing.hitHoldDurationMs,
  ]
  if (/[^01]/.test(steps)
    || positiveValues.some(value => !Number.isSafeInteger(value) || value <= 0)
    || nonnegativeValues.some(value => !Number.isSafeInteger(value) || value < 0)) {
    throw new RangeError('Invalid rhythm or timing values.')
  }

  const reservationDurationMs = getReservationDurationMs(timing)
  // 譜面を時刻順に読むため、各マスの直前の予約終了時刻で空きを判定できる。
  const reservedUntilMs = Array<number>(moleCount).fill(0)
  const schedule: ChallengeParams[] = []
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
    if (steps[stepIndex] === '0') continue

    const startAtMs = stepIndex * stepDurationMs
    const availableMoles = reservedUntilMs.flatMap((endAtMs, moleIndex) => (
      endAtMs <= startAtMs ? [moleIndex] : []
    ))
    if (availableMoles.length === 0) {
      throw new RangeError(`No mole available for rhythm step ${stepIndex}.`)
    }

    const moleIndex = availableMoles[Math.floor(random() * availableMoles.length)]
    schedule.push({ ...timing, moleIndex, startAtMs })
    reservedUntilMs[moleIndex] = startAtMs + reservationDurationMs
  }
  return schedule
}
