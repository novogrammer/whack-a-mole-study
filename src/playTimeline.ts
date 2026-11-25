export const INTRO_DURATION_MS = 4_000
export const ENDING_DISPLAY_DURATION_MS = 2_000

export type PlayStage = 'intro' | 'playing' | 'ending' | 'result'

export function getPlayStage(elapsedMs: number, gameDurationMs: number): PlayStage {
  if (elapsedMs < INTRO_DURATION_MS) return 'intro'
  if (elapsedMs < INTRO_DURATION_MS + gameDurationMs) return 'playing'
  if (elapsedMs < INTRO_DURATION_MS + gameDurationMs + ENDING_DISPLAY_DURATION_MS) return 'ending'
  return 'result'
}

export function getIntroMessage(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1_000)
  return seconds === 0 ? '準備' : String(Math.max(1, 4 - seconds))
}
