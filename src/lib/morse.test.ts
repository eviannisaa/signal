import { describe, expect, it } from 'vitest'
import {
  decode,
  encode,
  isSameAnswer,
  lettersOf,
  normalize,
  normalizeMorse,
  toDisplay,
  toDitDah,
  toTimings,
  totalUnits,
  unsupportedChars,
} from './morse'

describe('encode', () => {
  it('mengubah huruf dan kata', () => {
    expect(encode('SOS')).toBe('... --- ...')
    expect(encode('hi you')).toBe('.... .. / -.-- --- ..-')
  })
  it('melewati karakter tidak didukung', () => {
    expect(encode('aé')).toBe('.-')
    expect(unsupportedChars('aé😀é')).toEqual(['É', '😀'])
  })
})

describe('decode', () => {
  it('mengubah kode menjadi teks', () => {
    expect(decode('... --- ...')).toBe('SOS')
    expect(decode('.... .. / -.-- --- ..-')).toBe('HI YOU')
  })
  it('menandai urutan tidak valid dengan ?', () => {
    expect(decode('...... .-')).toBe('?A')
  })
  it('menerima variasi simbol', () => {
    expect(decode('••• ——— •••')).toBe('SOS')
    expect(decode('·– | –·')).toBe('A N')
  })
})

describe('normalize', () => {
  it('menyamakan input Morse', () => {
    expect(normalizeMorse('  •–  ·  ')).toBe('.- .')
    expect(normalizeMorse('.-//-.')).toBe('.- / -.')
  })
  it('menyamakan teks', () => {
    expect(normalize('  halo   dunia ')).toBe('HALO DUNIA')
  })
  it('membandingkan jawaban', () => {
    expect(isSameAnswer('··· ——— ···', '... --- ...')).toBe(true)
    expect(isSameAnswer('sos', 'SOS')).toBe(true)
    expect(isSameAnswer('sis', 'SOS')).toBe(false)
  })
})

describe('toTimings', () => {
  it('memakai unit dot 1, dash 3, jeda 1/3/7', () => {
    expect(toTimings('-.')).toEqual([
      { on: true, units: 3, symbol: '-' },
      { on: false, units: 1 },
      { on: true, units: 1, symbol: '.' },
    ])
    expect(totalUnits(toTimings('. / .'))).toBe(1 + 7 + 1)
    expect(totalUnits(toTimings('. .'))).toBe(1 + 3 + 1)
  })
})

describe('tampilan', () => {
  it('membuat simbol dan bacaan', () => {
    expect(toDisplay('-.')).toBe('—·')
    expect(toDitDah('-.')).toBe('dah dit')
    expect(lettersOf('... --- / -.')).toEqual(['...', '---', '-.'])
  })
})
