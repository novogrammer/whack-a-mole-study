import assert from 'node:assert/strict'
import test from 'node:test'
import { GameUI } from '../src/GameUI.ts'

// ブラウザーを使わず、画面切り替えで更新されるDOMの値を確認する。
function setup() {
  const elements = new Map()
  const root = {
    dataset: {},
    querySelector(selector) {
      const element = new EventTarget()
      Object.assign(element, { hidden: false, style: {}, textContent: '', disabled: false, focus() {} })
      elements.set(selector, element)
      return element
    },
  }
  return { ui: new GameUI(root), root, get: selector => elements.get(selector) }
}

test('結果からはタイトルへ戻り、次のスタート操作で再プレイする', () => {
  const { ui, root, get } = setup()
  let starts = 0
  ui.onStart(() => {
    starts++
    ui.showPlaying(32_000)
  })
  ui.showReady()
  assert.equal(root.dataset.touchScroll, 'allowed')
  assert.equal(get('#ready').hidden, false)
  assert.equal(get('#hud').hidden, true)
  assert.equal(get('#result').hidden, true)
  assert.equal(get('#start-challenge').disabled, false)
  assert.equal(get('.challenge-controls').style.visibility, 'visible')

  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 1)
  assert.equal(root.dataset.touchScroll, 'blocked')
  assert.equal(get('#ready').hidden, true)
  assert.equal(get('#hud').hidden, false)
  assert.equal(get('.challenge-controls').style.visibility, 'hidden')
  assert.equal(get('#remaining-time').textContent, '32')
  ui.updateScore(17)
  assert.equal(get('#score').textContent, '17')
  ui.showResult(17)
  assert.equal(root.dataset.touchScroll, 'allowed')
  assert.equal(get('#hud').hidden, true)
  assert.equal(get('#result').hidden, false)
  assert.equal(get('#final-score').textContent, '17')
  assert.equal(get('.challenge-controls').style.visibility, 'visible')
  assert.equal(get('#start-challenge').textContent, 'タイトルへ戻る')

  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 1, 'タイトルへ戻る操作ではプレイを開始しない')
  assert.equal(root.dataset.touchScroll, 'allowed')
  assert.equal(get('#ready').hidden, false)
  assert.equal(get('#hud').hidden, true)
  assert.equal(get('#result').hidden, true)
  assert.equal(get('#start-challenge').textContent, 'スタート')
  assert.equal(get('.challenge-controls').style.visibility, 'visible')

  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 2)
  assert.equal(root.dataset.touchScroll, 'blocked')
  assert.equal(get('#score').textContent, '0')
  assert.equal(get('#remaining-time').textContent, '32')
  assert.equal(get('#result').hidden, true)
})

test('残り時間を秒で切り上げ表示し、最後の帰還中も負数にしない', () => {
  const { ui, get } = setup()
  for (const [ms, expected] of [[31_001, '32'], [31_000, '31'], [1, '1'], [0, '0'], [-600, '0']]) {
    ui.updateRemainingTime(ms)
    assert.equal(get('#remaining-time').textContent, expected)
  }
})

test('開始操作のリスナーを解除できる', () => {
  const { ui, get } = setup()
  let starts = 0
  const unsubscribe = ui.onStart(() => starts++)
  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 1)
  unsubscribe()
  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 1)
})

test('イントロと終了表示では開始操作を受け付けず、結果への切り替えで案内を消す', () => {
  const { ui, root, get } = setup()
  let starts = 0
  ui.onStart(() => starts++)
  ui.showIntro()
  assert.equal(root.dataset.touchScroll, 'blocked')
  ui.updateIntro('3')
  assert.equal(get('#play-notice').textContent, '3')
  assert.equal(get('#hud').hidden, true)
  assert.equal(get('#ready').hidden, true)
  assert.equal(get('.challenge-controls').style.visibility, 'hidden')
  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 0)

  ui.showPlaying(32_000)
  assert.equal(root.dataset.touchScroll, 'blocked')
  assert.equal(get('#play-notice').hidden, true)
  ui.showEnding()
  assert.equal(get('.challenge-controls').style.visibility, 'hidden')
  assert.equal(root.dataset.touchScroll, 'blocked')
  assert.equal(get('#play-notice').textContent, '終了')
  assert.equal(get('#play-notice').hidden, false)
  assert.equal(get('#hud').hidden, true)
  get('#start-challenge').dispatchEvent(new Event('click'))
  assert.equal(starts, 0)

  ui.showResult(20)
  assert.equal(root.dataset.touchScroll, 'allowed')
  assert.equal(get('#play-notice').hidden, true)
  assert.equal(get('#result').hidden, false)
  ui.showReady()
  assert.equal(root.dataset.touchScroll, 'allowed')
  assert.equal(get('#play-notice').hidden, true)
  assert.equal(get('#ready').hidden, false)
})
