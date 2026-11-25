export class GameUI {
  private screen: 'ready' | 'playing' | 'result' = 'ready'
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
    const handleClick = () => {
      if (this.startButton.disabled) return

      if (this.screen === 'result') {
        this.showReady()
        this.startButton.focus({ preventScroll: true })
      } else if (this.screen === 'ready') {
        handler()
      }
    }
    this.startButton.addEventListener('click', handleClick)
    return () => this.startButton.removeEventListener('click', handleClick)
  }

  showReady() {
    this.screen = 'ready'
    this.ready.hidden = false
    this.hud.hidden = true
    this.result.hidden = true
    this.controls.hidden = false
    this.startButton.textContent = 'スタート'
    this.startButton.disabled = false
  }

  showPlaying(durationMs: number) {
    this.screen = 'playing'
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
    this.screen = 'result'
    this.ready.hidden = true
    this.hud.hidden = true
    this.result.hidden = false
    this.finalScore.textContent = String(score)
    this.controls.hidden = false
    this.startButton.textContent = 'タイトルへ戻る'
    this.startButton.disabled = false
    this.result.focus({ preventScroll: true })
  }
}
