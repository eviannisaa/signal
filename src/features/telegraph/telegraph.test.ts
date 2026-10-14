import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, checkSent, isSendComplete, parseTelegraphSettings, sentLetters } from './telegraph'

describe('sentLetters', () => {
  it('memecah kode per huruf dan mengabaikan jeda kata', () => {
    expect(sentLetters('... --- / ...')).toEqual(['...', '---', '...'])
    expect(sentLetters('.- ')).toEqual(['.-'])
    expect(sentLetters('')).toEqual([])
  })
})

describe('checkSent', () => {
  it('menandai huruf benar, salah, dan yang belum dikirim', () => {
    expect(checkSent('SOS', '... --.')).toEqual([
      { char: 'S', expected: '...', sent: '...', correct: true },
      { char: 'O', expected: '---', sent: '--.', correct: false },
      { char: 'S', expected: '...', sent: null, correct: false },
    ])
  })
})

describe('isSendComplete', () => {
  it('selesai saat jumlah huruf sama dengan soal', () => {
    expect(isSendComplete('HI', '....')).toBe(false)
    expect(isSendComplete('HI', '.... ..')).toBe(true)
  })
})

describe('parseTelegraphSettings', () => {
  it('memperbaiki field yang rusak tanpa membuang yang valid', () => {
    expect(
      parseTelegraphSettings({
        mode: 'receive',
        wpm: 99,
        level: 'x',
        voice: 'tone',
      }),
    ).toEqual({
      mode: 'receive',
      wpm: DEFAULT_SETTINGS.wpm,
      level: DEFAULT_SETTINGS.level,
      voice: 'tone',
    })
    expect(parseTelegraphSettings(null)).toEqual(DEFAULT_SETTINGS)
  })
})
