import { describe, expect, it } from 'vitest'

import { decode, encode } from '#/lib/morse'

import { CHALLENGE_VIEWS, QUESTION_COUNT, generateRounds } from './generate'

/** Generator acak deterministik (mulberry32) untuk test. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('generateRounds', () => {
  it('membuat 10 soal dengan posisi berurutan', () => {
    const rounds = generateRounds(seeded(1))
    expect(rounds).toHaveLength(QUESTION_COUNT)
    expect(rounds.map((r) => r.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('mencampur soal encode dan decode', () => {
    const rounds = generateRounds(seeded(2))
    expect(rounds.filter((r) => r.type === 'encode').length).toBeGreaterThan(0)
    expect(rounds.filter((r) => r.type === 'decode').length).toBeGreaterThanOrEqual(CHALLENGE_VIEWS.length)
  })

  it('memberi view hanya pada soal decode', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const r of generateRounds(seeded(seed))) {
        if (r.type === 'decode') expect(CHALLENGE_VIEWS).toContain(r.view)
        else expect(r.view).toBeNull()
      }
    }
  })

  it('memunculkan kelima view dalam satu ronde', () => {
    for (let seed = 0; seed < 50; seed++) {
      const views = new Set(generateRounds(seeded(seed)).map((r) => r.view).filter(Boolean))
      expect(views.size).toBe(CHALLENGE_VIEWS.length)
    }
  })

  it('memulai giliran view dari posisi acak', () => {
    const firstViews = new Set<string>()
    for (let seed = 0; seed < 50; seed++) {
      const first = generateRounds(seeded(seed)).find((r) => r.type === 'decode')
      firstViews.add(first!.view!)
    }
    expect(firstViews.size).toBeGreaterThan(1)
  })

  it('deterministik jika sumber acak sama', () => {
    expect(generateRounds(seeded(42))).toEqual(generateRounds(seeded(42)))
    expect(generateRounds(seeded(42))).not.toEqual(generateRounds(seeded(43)))
  })

  it('menyimpan kunci jawaban yang konsisten dengan soal', () => {
    for (const r of generateRounds(seeded(7))) {
      if (r.type === 'encode') expect(r.answer).toBe(encode(r.prompt))
      else expect(decode(r.prompt)).toBe(r.answer)
    }
  })

  it('tidak mengulang soal yang sama dalam satu ronde', () => {
    for (let seed = 0; seed < 50; seed++) {
      const texts = generateRounds(seeded(seed)).map((r) => (r.type === 'encode' ? r.prompt : r.answer))
      expect(new Set(texts).size).toBe(texts.length)
    }
  })
})
