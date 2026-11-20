import assert from 'node:assert/strict'
import test from 'node:test'
import { Challenge } from '../src/Challenge.ts'
import {
  generateChallengeSchedule,
  getReservationDurationMs,
} from '../src/generateChallengeSchedule.ts'

const timing = {
  moveDurationMs: 150, holdDurationMs: 1_000,
  hitSquashDurationMs: 90, hitHoldDurationMs: 120,
}
const options = { playDurationMs: 30_000, moleCount: 9, challengeCount: 30, timing }

function seededRandom(seed) {
  let value = seed
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 2 ** 32
  }
}

function checkReservations(schedule, config) {
  assert.equal(schedule.length, config.challengeCount)
  const endTimes = Array(config.moleCount).fill(0)
  for (const item of schedule) {
    assert.ok(Number.isInteger(item.startAtMs))
    assert.ok(item.moleIndex >= 0 && item.moleIndex < config.moleCount)
    assert.ok(item.startAtMs >= endTimes[item.moleIndex], '同じマスの予約が重ならない')
    const endAtMs = item.startAtMs + getReservationDurationMs(item)
    assert.ok(endAtMs <= config.playDurationMs, '予約全体がプレイ時間内に収まる')
    endTimes[item.moleIndex] = endAtMs
  }
}

test('多数の乱数系列で必要数を生成し、同じマスの予約を重ねない', () => {
  for (let seed = 0; seed < 100; seed++) {
    checkReservations(generateChallengeSchedule(options, seededRandom(seed)), options)
  }
})

test('余白ゼロの最大件数でも再抽選なしで生成でき、別マスは同時に使える', () => {
  const config = { ...options, playDurationMs: 3_200, challengeCount: 18 }
  const schedule = generateChallengeSchedule(config, () => 0)
  checkReservations(schedule, config)
  assert.equal(schedule.filter(item => item.startAtMs === 0).length, 9)
  assert.equal(schedule.filter(item => item.startAtMs === 1_600).length, 9)
})

test('0件と容量不足を扱い、容量不足では乱数抽選に入らない', () => {
  assert.deepEqual(generateChallengeSchedule({ ...options, challengeCount: 0 }), [])
  assert.throws(() => generateChallengeSchedule(
    { ...options, playDurationMs: 1_600, challengeCount: 10 },
    () => { throw new Error('乱数を呼んではいけない') },
  ), RangeError)
})

test('同じ乱数系列なら再現でき、異なる系列では時刻やマスが変わる', () => {
  const schedule = generateChallengeSchedule(options, seededRandom(1))
  assert.deepEqual(schedule, generateChallengeSchedule(options, seededRandom(1)))
  assert.notDeepEqual(schedule, generateChallengeSchedule(options, seededRandom(2)))
})

test('負数・小数など生成できない設定を明示的に拒否する', () => {
  for (const invalid of [
    { moleCount: 0 }, { challengeCount: -1 }, { challengeCount: 0.5 },
    { playDurationMs: NaN }, { timing: { ...timing, moveDurationMs: 0 } },
  ]) {
    assert.throws(() => generateChallengeSchedule({ ...options, ...invalid }), RangeError)
  }
})

test('生成した進行表を実行しても、命中や時間更新の飛びで同じマスを奪い合わない', () => {
  for (const stepMs of [17, 173, 30_000]) {
    const busy = new Map()
    const callbacks = new Map()
    const context = {
      emergeMole(index, durationMs, onTap) {
        assert.equal(busy.has(index), false, '前のチャレンジが隠れてから出現する')
        busy.set(index, true)
        callbacks.set(index, onTap)
      },
      holdMole(index) { assert.ok(busy.has(index)) },
      showHitReaction(index) { assert.ok(busy.has(index)) },
      returnMole(index) { assert.ok(busy.has(index)) },
      hideMole(index) {
        assert.ok(busy.has(index))
        busy.delete(index)
        callbacks.delete(index)
      },
    }
    const challenges = generateChallengeSchedule(options, seededRandom(12))
      .map(params => new Challenge(context, params))
    for (let timeMs = 0; timeMs < 30_000; timeMs += stepMs) {
      for (const challenge of challenges) challenge.onUpdate(timeMs)
      if (timeMs % 2 === 0) {
        for (const onTap of [...callbacks.values()]) onTap(timeMs)
      }
    }
    for (const challenge of challenges) challenge.onUpdate(30_000)
    assert.equal(busy.size, 0)
    assert.ok(challenges.every(challenge => challenge.phase === 'completed'))
  }
})
