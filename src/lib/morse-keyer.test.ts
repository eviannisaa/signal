import { describe, expect, it } from 'vitest'
import { classifyGap, classifyPress, marksFromTimings } from './morse-keyer'
import { toTimings, unitMs } from './morse'

const unit = unitMs(12) // 100 ms

describe('classifyPress', () => {
  it('membaca tekanan pendek sebagai dot', () => {
    expect(classifyPress(60, unit)).toBe('.')
    expect(classifyPress(199, unit)).toBe('.')
  })

  it('membaca tekanan 2 unit atau lebih sebagai dash', () => {
    expect(classifyPress(200, unit)).toBe('-')
    expect(classifyPress(420, unit)).toBe('-')
  })
})

describe('classifyGap', () => {
  it('membedakan jeda simbol, huruf, dan kata', () => {
    expect(classifyGap(120, unit)).toBe('symbol')
    expect(classifyGap(300, unit)).toBe('letter')
    expect(classifyGap(650, unit)).toBe('letter')
    expect(classifyGap(700, unit)).toBe('word')
  })
})

describe('marksFromTimings', () => {
  it('mengubah unit menjadi milidetik', () => {
    expect(marksFromTimings(toTimings('.-'), unit)).toEqual([
      { on: true, ms: 100 },
      { on: false, ms: 100 },
      { on: true, ms: 300 },
    ])
  })
})
