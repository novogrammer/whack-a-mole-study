import assert from 'node:assert/strict'
import test from 'node:test'
import { Challenge } from '../src/Challenge.ts'

const params = {
  startAtMs: 200,
  moveDurationMs: 150,
  holdDurationMs: 1_000,
  hitSquashDurationMs: 90,
  hitHoldDurationMs: 120,
}

function setup() {
  const calls = []
  const context = {
    emergeMole: (...args) => calls.push(['emergeMole', ...args]),
    holdMole: () => calls.push(['holdMole']),
    showHitReaction: (...args) => calls.push(['showHitReaction', ...args]),
    returnMole: (...args) => calls.push(['returnMole', ...args]),
    hideMole: () => calls.push(['hideMole']),
  }
  return { challenge: new Challenge(context, params), context, calls }
}

test('時間入力だけで通常のチャレンジを進め、Contextに演出を依頼する', () => {
  const { challenge, calls } = setup()
  assert.equal(challenge.onTap(199), false)
  assert.deepEqual(calls, [])
  challenge.onUpdate(200)
  assert.equal(challenge.phase, 'emerging')
  challenge.onUpdate(349)
  assert.equal(challenge.phase, 'emerging')
  challenge.onUpdate(350)
  assert.equal(challenge.phase, 'waiting')
  challenge.onUpdate(1_349)
  assert.equal(challenge.phase, 'waiting')
  challenge.onUpdate(1_350)
  assert.equal(challenge.phase, 'returning')
  assert.equal(challenge.onTap(1_350), false)
  challenge.onUpdate(1_500)
  challenge.onUpdate(10_000)
  assert.equal(challenge.phase, 'completed')
  assert.equal(challenge.isHit, false)
  assert.deepEqual(calls, [
    ['emergeMole', 150], ['holdMole'], ['returnMole', 150], ['hideMole'],
  ])
})

for (const [phase, tapAtMs, returnDurationMs] of [
  ['emerging', 275, 75],
  ['waiting', 500, 150],
]) {
  test(`${phase}で命中し、重複命中せずリアクション後に同じ速度で帰還する`, () => {
    const { challenge, context, calls } = setup()
    challenge.onUpdate(tapAtMs)
    assert.equal(challenge.onTap(tapAtMs), true)
    assert.equal(challenge.phase, phase)
    assert.equal(challenge.isHit, true)
    assert.equal(challenge.canHit(), false)
    assert.equal(challenge.onTap(tapAtMs + 1), false)
    assert.deepEqual(calls.at(-1), ['showHitReaction', 90, 120])

    challenge.onUpdate(tapAtMs + 299)
    assert.equal(challenge.phase, phase)
    challenge.onUpdate(tapAtMs + 300)
    assert.equal(challenge.phase, 'returning')
    assert.deepEqual(calls.at(-1), ['returnMole', returnDurationMs])
    challenge.onUpdate(tapAtMs + 300 + returnDurationMs)
    assert.equal(challenge.phase, 'completed')
    assert.equal(challenge.isHit, true)
    assert.equal(calls.filter(([name]) => name === 'showHitReaction').length, 1)
    assert.deepEqual(calls.at(-1), ['hideMole'])

    const replay = new Challenge(context, params)
    assert.equal(replay.phase, 'idle')
    assert.equal(replay.isHit, false)
  })
}

test('更新間隔が空いても、状態が追いつき演出を重複依頼しない', () => {
  const { challenge, calls } = setup()
  challenge.onUpdate(10_000)
  challenge.onUpdate(10_001)
  assert.equal(challenge.phase, 'completed')
  assert.deepEqual(calls, [
    ['emergeMole', 150], ['holdMole'], ['returnMole', 150], ['hideMole'],
  ])
})

test('帰還開始時刻を過ぎたタップは、直前の更新が停止中でも命中しない', () => {
  const { challenge, calls } = setup()
  challenge.onUpdate(350)
  assert.equal(challenge.phase, 'waiting')
  assert.equal(challenge.onTap(1_350), false)
  assert.equal(challenge.phase, 'returning')
  assert.equal(challenge.isHit, false)
  assert.equal(calls.some(([name]) => name === 'showHitReaction'), false)
})
