import assert from 'node:assert/strict'
import test from 'node:test'
import { Challenge } from '../src/Challenge.ts'
import { CHALLENGE_RHYTHM, RHYTHM_DURATION_MS, RHYTHM_STEP_DURATION_MS } from '../src/challengeRhythm.ts'
import {
  generateChallengeSchedule,
  getReservationDurationMs,
} from '../src/generateChallengeSchedule.ts'

const timing = {
  moveDurationMs: 150, holdDurationMs: 1_000,
  hitSquashDurationMs: 90, hitHoldDurationMs: 120,
}
const options = {
  rhythm: CHALLENGE_RHYTHM, stepDurationMs: RHYTHM_STEP_DURATION_MS, moleCount: 9, timing,
}

function seededRandom(seed) {
  let value = seed
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    return value / 2 ** 32
  }
}

function checkReservations(schedule, config) {
  assert.equal(schedule.length, config.rhythm.join('').replace(/[^1]/g, '').length)
  const endTimes = Array(config.moleCount).fill(0)
  for (const item of schedule) {
    assert.ok(Number.isInteger(item.startAtMs))
    assert.ok(item.moleIndex >= 0 && item.moleIndex < config.moleCount)
    assert.ok(item.startAtMs >= endTimes[item.moleIndex], '同じマスの予約が重ならない')
    const endAtMs = item.startAtMs + getReservationDurationMs(item)
    endTimes[item.moleIndex] = endAtMs
  }
}

test('多数の乱数系列で必要数を生成し、同じマスの予約を重ねない', () => {
  for (let seed = 0; seed < 100; seed++) {
    checkReservations(generateChallengeSchedule(options, seededRandom(seed)), options)
  }
})

test('128枠・32秒の譜面どおりに40件の開始時刻を生成する', () => {
  const schedule = generateChallengeSchedule(options, seededRandom(1))
  const seconds = [
    0, 2, 4, 6,
    8, 9.5, 10, 11.5, 12, 13.5, 14, 15.5,
    16, 17, 17.5, 18, 19, 19.5, 20, 21, 21.5, 22, 23, 23.5,
    24, 24.5, 25, 26, 26.25, 26.5, 26.75, 27, 28, 28.5, 29, 30, 30.25, 30.5, 30.75, 31,
  ]
  assert.equal(RHYTHM_DURATION_MS, 32_000)
  assert.equal(schedule.length, 40)
  assert.deepEqual(schedule.map(item => item.startAtMs), seconds.map(value => value * 1_000))
})

test('空いているマスがなければ時刻をずらさずにエラーを返す', () => {
  assert.deepEqual(generateChallengeSchedule({ ...options, rhythm: ['0000'] }), [])
  assert.throws(() => generateChallengeSchedule({ ...options, moleCount: 1 }), RangeError)
})

test('予約終了と同時に同じマスを再利用できる', () => {
  const schedule = generateChallengeSchedule({
    ...options, rhythm: ['11'], stepDurationMs: 1_600, moleCount: 1,
  })
  assert.deepEqual(schedule.map(item => item.startAtMs), [0, 1_600])
})

test('同じ乱数系列なら再現でき、異なる系列でも出現時刻は変わらない', () => {
  const schedule = generateChallengeSchedule(options, seededRandom(1))
  assert.deepEqual(schedule, generateChallengeSchedule(options, seededRandom(1)))
  const other = generateChallengeSchedule(options, seededRandom(2))
  assert.notDeepEqual(schedule.map(item => item.moleIndex), other.map(item => item.moleIndex))
  assert.deepEqual(schedule.map(item => item.startAtMs), other.map(item => item.startAtMs))
})

test('負数・小数など生成できない設定を明示的に拒否する', () => {
  for (const invalid of [
    { moleCount: 0 }, { rhythm: ['100X'] }, { stepDurationMs: 0.5 },
    { stepDurationMs: NaN }, { timing: { ...timing, moveDurationMs: 0 } },
  ]) {
    assert.throws(() => generateChallengeSchedule({ ...options, ...invalid }), RangeError)
  }
})

test('生成した進行表を実行しても、命中や時間更新の飛びで同じマスを奪い合わない', () => {
  for (const stepMs of [17, 173, 32_600]) {
    const busy = new Map()
    const callbacks = new Map()
    const context = {
      addScore() {},
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
    for (let timeMs = 0; timeMs < 32_600; timeMs += stepMs) {
      for (const challenge of challenges) challenge.onUpdate(timeMs)
      if (timeMs % 2 === 0) {
        for (const onTap of [...callbacks.values()]) onTap(timeMs)
      }
    }
    for (const challenge of challenges) challenge.onUpdate(32_600)
    assert.equal(busy.size, 0)
    assert.ok(challenges.every(challenge => challenge.phase === 'completed'))
  }
})


test('最後のモグラは32秒で打ち切らず、帰還が終わるまで進められる', () => {
  const context = {
    emergeMole() {}, holdMole() {}, showHitReaction() {}, returnMole() {}, hideMole() {}, addScore() {},
  }
  const schedule = generateChallengeSchedule(options, seededRandom(1))
  const last = new Challenge(context, schedule.at(-1))
  last.onUpdate(32_000)
  assert.equal(last.phase, 'waiting')
  assert.equal(last.onTap(32_149), true)
  last.onUpdate(32_599)
  assert.equal(last.phase, 'completed')
})


test('譜面の40件すべてに命中すると40点になり、再タップでは増えない', () => {
  let score = 0
  const taps = new Map()
  const context = {
    emergeMole(index, durationMs, onTap) { taps.set(index, onTap) },
    holdMole() {}, showHitReaction() {}, returnMole() {},
    hideMole(index) { taps.delete(index) },
    addScore(points) { score += points },
  }
  const challenges = generateChallengeSchedule(options, seededRandom(5))
    .map(params => new Challenge(context, params))
  for (let timeMs = 0; timeMs <= 32_600; timeMs += 10) {
    for (const challenge of challenges) challenge.onUpdate(timeMs)
    for (const onTap of [...taps.values()]) {
      onTap(timeMs)
      onTap(timeMs)
    }
  }
  assert.equal(score, 40)
  assert.ok(challenges.every(challenge => challenge.phase === 'completed'))
})
