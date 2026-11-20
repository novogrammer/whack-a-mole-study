import assert from 'node:assert/strict'
import test from 'node:test'
import { Challenge } from '../src/Challenge.ts'

const params = {
  startAtMs: 200,
  moleIndex: 0,
  moveDurationMs: 150,
  holdDurationMs: 1_000,
  hitSquashDurationMs: 90,
  hitHoldDurationMs: 120,
}

function setup(moleIndex = 0) {
  const calls = []
  let onMoleTap
  const context = {
    emergeMole: (moleIndex, durationMs, onTap) => {
      onMoleTap = onTap
      calls.push(['emergeMole', moleIndex, durationMs])
    },
    holdMole: (...args) => calls.push(['holdMole', ...args]),
    showHitReaction: (...args) => calls.push(['showHitReaction', ...args]),
    returnMole: (...args) => calls.push(['returnMole', ...args]),
    hideMole: (...args) => calls.push(['hideMole', ...args]),
  }
  return {
    challenge: new Challenge(context, { ...params, moleIndex }), context, calls,
    tapMole: elapsedMs => {
      assert.equal(typeof onMoleTap, 'function')
      onMoleTap(elapsedMs)
    },
  }
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
    ['emergeMole', 0, 150], ['holdMole', 0], ['returnMole', 0, 150], ['hideMole', 0],
  ])
})

for (const [phase, tapAtMs, returnDurationMs] of [
  ['emerging', 275, 75],
  ['waiting', 500, 150],
]) {
  test(`${phase}で命中し、重複命中せずリアクション後に同じ速度で帰還する`, () => {
    const { challenge, context, calls, tapMole } = setup()
    challenge.onUpdate(tapAtMs)
    tapMole(tapAtMs)
    assert.equal(challenge.phase, phase)
    assert.equal(challenge.isHit, true)
    tapMole(tapAtMs + 1)
    assert.deepEqual(calls.at(-1), ['showHitReaction', 0, 90, 120])

    challenge.onUpdate(tapAtMs + 299)
    assert.equal(challenge.phase, phase)
    challenge.onUpdate(tapAtMs + 300)
    assert.equal(challenge.phase, 'returning')
    assert.deepEqual(calls.at(-1), ['returnMole', 0, returnDurationMs])
    challenge.onUpdate(tapAtMs + 300 + returnDurationMs)
    assert.equal(challenge.phase, 'completed')
    assert.equal(challenge.isHit, true)
    assert.equal(calls.filter(([name]) => name === 'showHitReaction').length, 1)
    assert.deepEqual(calls.at(-1), ['hideMole', 0])

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
    ['emergeMole', 0, 150], ['holdMole', 0], ['returnMole', 0, 150], ['hideMole', 0],
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

test('出現時に渡されたコールバックは、そのChallengeだけに入力を渡す', () => {
  const first = setup()
  const second = setup()
  first.challenge.onUpdate(350)
  second.challenge.onUpdate(350)
  first.tapMole(500)
  assert.equal(first.challenge.isHit, true)
  assert.equal(second.challenge.isHit, false)
  first.challenge.onUpdate(950)
  first.tapMole(1_000)
  assert.equal(first.challenge.phase, 'completed')
  assert.equal(first.calls.filter(([name]) => name === 'showHitReaction').length, 1)
})


test('出現から帰還・非表示まで、設定されたmoleIndexをContextに渡す', () => {
  const { challenge, calls, tapMole } = setup(3)
  challenge.onUpdate(350)
  tapMole(500)
  challenge.onUpdate(950)
  assert.deepEqual(calls, [
    ['emergeMole', 3, 150],
    ['holdMole', 3],
    ['showHitReaction', 3, 90, 120],
    ['returnMole', 3, 150],
    ['hideMole', 3],
  ])
})
