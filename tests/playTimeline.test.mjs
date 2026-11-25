import assert from 'node:assert/strict'
import test from 'node:test'
import { getIntroMessage, getPlayStage } from '../src/playTimeline.ts'

test('4秒で本編、36秒で終了表示、38秒で結果へ進む', () => {
  for (const [timeMs, expected] of [
    [0, 'intro'], [3_999, 'intro'], [4_000, 'playing'], [35_999, 'playing'],
    [36_000, 'ending'], [37_999, 'ending'], [38_000, 'result'], [40_000, 'result'],
  ]) assert.equal(getPlayStage(timeMs, 32_000), expected)
})

test('イントロ中は準備を表示した後、3・2・1で開始を予告する', () => {
  assert.deepEqual([0, 999, 1_000, 2_000, 3_000, 3_999].map(getIntroMessage),
    ['準備', '準備', '3', '2', '1', '1'])
})
