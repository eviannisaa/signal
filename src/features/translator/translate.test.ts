import { describe, expect, it } from 'vitest'

import { MAX_INPUT_LENGTH, copyValue, decodeLetters, nonMorseChars, swapInput, translate } from './translate'

describe('translate TEKS → MORSE', () => {
  it('mengubah teks menjadi kode Morse', () => {
    const r = translate('sos', 'text-to-morse')
    expect(r.code).toBe('... --- ...')
    expect(r.text).toBe('SOS')
    expect(r.unsupported).toEqual([])
  })

  it('menandai karakter tidak didukung tanpa menghapusnya dari token', () => {
    const r = translate('Café 😀', 'text-to-morse')
    expect(r.unsupported).toEqual(['É', '😀'])
    expect(r.tokens.map((t) => t.char)).toEqual(['C', 'A', 'F', 'É', ' ', '😀'])
    expect(r.tokens.find((t) => t.char === 'É')?.code).toBeNull()
    expect(r.code).toBe('-.-. .- ..-.')
  })

  it('merapatkan spasi berlebih menjadi satu jeda kata', () => {
    const r = translate('  a   b ', 'text-to-morse')
    expect(r.code).toBe('.- / -...')
    expect(r.tokens.filter((t) => t.char === ' ')).toHaveLength(1)
  })

  it('memotong input ke batas maksimum', () => {
    const r = translate('e'.repeat(MAX_INPUT_LENGTH + 50), 'text-to-morse')
    expect(r.text).toHaveLength(MAX_INPUT_LENGTH)
  })
})

describe('translate MORSE → TEKS', () => {
  it('menerima variasi simbol', () => {
    expect(translate('••• ——— •••', 'morse-to-text').text).toBe('SOS')
    expect(translate('.- | -...', 'morse-to-text').text).toBe('A B')
    expect(translate('·– / –···', 'morse-to-text').code).toBe('.- / -...')
  })

  it('menampilkan ? untuk urutan yang tidak ada di tabel', () => {
    const r = translate('... -------- ...', 'morse-to-text')
    expect(r.text).toBe('S?S')
    expect(r.invalidCount).toBe(1)
    expect(r.words[0][1]).toEqual({ code: '--------', char: null })
  })

  it('membedakan tanda tanya valid dari urutan tidak valid', () => {
    const r = translate('..--..', 'morse-to-text')
    expect(r.text).toBe('?')
    expect(r.invalidCount).toBe(0)
  })

  it('menandai karakter non-Morse', () => {
    const r = translate('.- x -', 'morse-to-text')
    expect(r.unsupported).toEqual(['x'])
    expect(r.text).toBe('AT')
  })
})

describe('helper', () => {
  it('decodeLetters mengembalikan kosong untuk input kosong', () => {
    expect(decodeLetters('   ')).toEqual([])
  })

  it('nonMorseChars tanpa duplikasi', () => {
    expect(nonMorseChars('ab.a-')).toEqual(['a', 'b'])
  })

  it('copyValue dan swapInput mengikuti arah', () => {
    const t = translate('hi', 'text-to-morse')
    expect(copyValue(t)).toBe('.... ..')
    expect(swapInput(t)).toBe('.... ..')
    const m = translate('.... .. / --------', 'morse-to-text')
    expect(copyValue(m)).toBe('HI ?')
    expect(swapInput(m)).toBe('HI')
  })
})
