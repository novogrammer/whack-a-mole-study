export class GameUI {
  private readonly ready: HTMLElement
  private readonly hud: HTMLElement
  private readonly result: HTMLElement
  private readonly controls: HTMLElement
  private readonly startButton: HTMLButtonElement
  private readonly score: HTMLElement
  private readonly remainingTime: HTMLElement
  private readonly finalScore: HTMLElement

  constructor(root: HTMLElement) {
    this.ready = root.querySelector<HTMLElement>('#ready')!
    this.hud = root.querySelector<HTMLElement>('#hud')!
    this.result = root.querySelector<HTMLElement>('#result')!
    this.controls = root.querySelector<HTMLElement>('.challenge-controls')!
    this.startButton = root.querySelector<HTMLButtonElement>('#start-challenge')!
    this.score = root.querySelector<HTMLElement>('#score')!
    this.remainingTime = root.querySelector<HTMLElement>('#remaining-time')!
    this.finalScore = root.querySelector<HTMLElement>('#final-score')!
  }

  onStart(handler: () => void): () => void {
    this.startButton.addEventListener('click', handler)
    return () => this.startButton.removeEventListener('click', handler)
  }

  showReady() {
    this.ready.hidden = false
    this.hud.hidden = true
    this.result.hidden = true
    this.controls.hidden = false
    this.startButton.textContent = 'スタート'
    this.startButton.disabled = false
  }

  showPlaying(durationMs: number) {
    this.ready.hidden = true
    this.hud.hidden = false
    this.result.hidden = true
    this.controls.hidden = true
    this.startButton.disabled = true
    this.updateScore(0)
    this.updateRemainingTime(durationMs)
  }

  updateScore(score: number) {
    this.score.textContent = String(score)
  }

  updateRemainingTime(remainingMs: number) {
    const seconds = String(Math.max(0, Math.ceil(remainingMs / 1_000)))
    if (this.remainingTime.textContent !== seconds) this.remainingTime.textContent = seconds
  }

  showResult(score: number) {
    this.ready.hidden = true
    this.hud.hidden = true
    this.result.hidden = false
    this.finalScore.textContent = String(score)
    this.controls.hidden = false
    this.startButton.textContent = 'もう一度'
    this.startButton.disabled = false
    this.result.focus({ preventScroll: true })
  }
}
