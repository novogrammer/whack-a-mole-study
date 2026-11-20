import assert from 'node:assert/strict'
import test from 'node:test'
import { Challenge } from '../src/Challenge.ts'

const params = { startAtMs: 200, moveDurationMs: 150, holdDurationMs: 1_000 }

test('進行表の開始時刻までは待機し、完了後は再出現しない', () => {
  const challenge = new Challenge(params)
  challenge.update(199)
  assert.equal(challenge.phase, 'idle')
  assert.equal(challenge.hit(), false)

  challenge.update(200)
  assert.equal(challenge.phase, 'emerging')
  challenge.finishEmerging()
  assert.equal(challenge.phase, 'waiting')
  challenge.finishWaiting()
  assert.equal(challenge.phase, 'returning')
  assert.equal(challenge.hit(), false)
  challenge.finishReturning()
  challenge.update(10_000)
  assert.equal(challenge.phase, 'completed')
  assert.equal(challenge.isHit, false)
})

for (const phase of ['emerging', 'waiting']) {
  test(`${phase}で命中してもphaseを維持し、重複命中や通常進行を受け付けない`, () => {
    const challenge = new Challenge(params)
    challenge.update(200)
    if (phase === 'waiting') challenge.finishEmerging()

    assert.equal(challenge.canHit(), true)
    assert.equal(challenge.hit(), true)
    assert.equal(challenge.isHit, true)
    assert.equal(challenge.phase, phase)
    assert.equal(challenge.hit(), false)

    challenge.finishEmerging()
    challenge.finishWaiting()
    challenge.update(10_000)
    assert.equal(challenge.phase, phase)

    challenge.finishHitReaction()
    assert.equal(challenge.phase, 'returning')
    assert.equal(challenge.canHit(), false)
    challenge.finishReturning()
    assert.equal(challenge.phase, 'completed')
    assert.equal(challenge.isHit, true)

    const replay = new Challenge(params)
    assert.equal(replay.phase, 'idle')
    assert.equal(replay.isHit, false)
  })
}

test('命中していなければリアクション完了通知で進行しない', () => {
  const challenge = new Challenge(params)
  challenge.update(200)
  challenge.finishHitReaction()
  assert.equal(challenge.phase, 'emerging')
})
