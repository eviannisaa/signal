import { describe, expect, it } from 'vitest'

import { MORSE_VIEWS } from '#/lib/morse'
import { LONG_WORDS, SHORT_WORDS } from '#/lib/prompts'
import {
  EMPTY_STATS,
  accuracy,
  checkAnswer,
  createQuestion,
  editMorseInput,
  parseViewChoice,
  pickView,
  recordAnswer,
} from './practice'
import type { PracticeQuestion } from './practice'

function seq(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('parseViewChoice', () => {
  it('menerima kelima view dan random', () => {
    for (const v of [...MORSE_VIEWS, 'random']) expect(parseViewChoice(v)).toBe(v)
  })
  it('kembali ke random untuk nilai tidak valid', () => {
    expect(parseViewChoice('video')).toBe('random')
    expect(parseViewChoice(null)).toBe('random')
    expect(parseViewChoice(3)).toBe('random')
  })
})

describe('pickView', () => {
  it('memakai view yang dipilih', () => {
    expect(pickView('chart')).toBe('chart')
  })
  it('memilih view acak dari MORSE_VIEWS', () => {
    expect(pickView('random', () => 0)).toBe('audio')
    expect(pickView('random', () => 0.99)).toBe('text')
  })
})

describe('createQuestion', () => {
  it('membuat soal encode tanpa view', () => {
    const q = createQuestion('encode', 'letter', 'random', { random: () => 0 })
    expect(q).toEqual({ mode: 'encode', level: 'letter', prompt: 'A', code: '.-', view: null })
  })
  it('membuat soal decode dengan view sesuai pilihan', () => {
    const q = createQuestion('decode', 'short', 'timeline', { random: () => 0 })
    expect(q.prompt).toBe(SHORT_WORDS[0])
    expect(q.code).toBe('... --- ...')
    expect(q.view).toBe('timeline')
  })
  it('memakai kata panjang untuk level long', () => {
    const q = createQuestion('decode', 'long', 'text', { random: () => 0 })
    expect(LONG_WORDS).toContain(q.prompt)
  })
  it('menghindari soal yang sama berturut-turut', () => {
    const q = createQuestion('encode', 'letter', 'random', { previous: 'A', random: seq(0, 0, 0.5) })
    expect(q.prompt).not.toBe('A')
  })
})

const encodeQ: PracticeQuestion = { mode: 'encode', level: 'short', prompt: 'SOS', code: '... --- ...', view: null }
const decodeQ: PracticeQuestion = { mode: 'decode', level: 'short', prompt: 'HI', code: '.... ..', view: 'text' }

describe('checkAnswer', () => {
  it('menilai encode dengan variasi simbol', () => {
    expect(checkAnswer(encodeQ, '••• ——— •••', 'id')).toMatchObject({ ok: true, correct: true, given: '... --- ...' })
    expect(checkAnswer(encodeQ, '...  ---   ... ', 'id')).toMatchObject({ ok: true, correct: true })
    expect(checkAnswer(encodeQ, '... --- ..', 'id')).toMatchObject({ ok: true, correct: false, expected: '... --- ...' })
  })
  it('menolak encode yang bukan kode Morse', () => {
    expect(checkAnswer(encodeQ, 'SOS', 'id')).toMatchObject({ ok: false })
    expect(checkAnswer(encodeQ, '   ', 'id')).toMatchObject({ ok: false })
  })
  it('menilai decode tanpa membedakan huruf besar/kecil', () => {
    expect(checkAnswer(decodeQ, ' hi ', 'id')).toMatchObject({ ok: true, correct: true, given: 'HI' })
    expect(checkAnswer(decodeQ, 'HE', 'id')).toMatchObject({ ok: true, correct: false, expected: 'HI' })
  })
  it('menolak karakter yang tidak didukung', () => {
    const r = checkAnswer(decodeQ, 'hé', 'id')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('É')
  })
})

describe('session stats', () => {
  it('menghitung akurasi dan streak', () => {
    let s = EMPTY_STATS
    expect(accuracy(s)).toBe(0)
    s = recordAnswer(s, true)
    s = recordAnswer(s, true)
    s = recordAnswer(s, false)
    s = recordAnswer(s, true)
    expect(s).toEqual({ answered: 4, correct: 3, streak: 1, best: 2 })
    expect(accuracy(s)).toBe(0.75)
  })
})

describe('editMorseInput', () => {
  it('menambah simbol dan pemisah', () => {
    let v = ''
    v = editMorseInput(v, '.')
    v = editMorseInput(v, '-')
    v = editMorseInput(v, 'letter')
    v = editMorseInput(v, 'letter')
    v = editMorseInput(v, '.')
    v = editMorseInput(v, 'word')
    v = editMorseInput(v, 'word')
    v = editMorseInput(v, '-')
    expect(v).toBe('.- . / -')
  })
  it('tidak menambah pemisah di awal', () => {
    expect(editMorseInput('', 'letter')).toBe('')
    expect(editMorseInput('', 'word')).toBe('')
  })
  it('menghapus satu langkah', () => {
    expect(editMorseInput('.- / ', 'backspace')).toBe('.-')
    expect(editMorseInput('.-', 'backspace')).toBe('.')
    expect(editMorseInput('.-', 'clear')).toBe('')
  })
})
