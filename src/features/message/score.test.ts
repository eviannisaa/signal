import { describe, expect, it } from 'vitest'

import { attemptsLeft, computeScores, messageStatus, validateMessageText } from './score'

describe('messageStatus', () => {
  it('membedakan pesan sendiri, terbuka, benar, dan gagal', () => {
    expect(messageStatus(true, undefined)).toBe('mine')
    expect(messageStatus(false, undefined)).toBe('open')
    expect(messageStatus(false, { attempts: 2, isCorrect: false })).toBe('open')
    expect(messageStatus(false, { attempts: 2, isCorrect: true })).toBe('correct')
    expect(messageStatus(false, { attempts: 3, isCorrect: false })).toBe('failed')
  })

  it('menghitung sisa kesempatan', () => {
    expect(attemptsLeft(undefined)).toBe(3)
    expect(attemptsLeft({ attempts: 2 })).toBe(1)
    expect(attemptsLeft({ attempts: 5 })).toBe(0)
  })
})

describe('validateMessageText', () => {
  it('menerima teks Morse yang didukung', () => {
    expect(validateMessageText('Halo, apa kabar?', 'id')).toBeNull()
  })
  it('menolak teks kosong, terlalu panjang, dan karakter tidak didukung', () => {
    expect(validateMessageText('   ', 'id')).toMatch(/kosong/)
    expect(validateMessageText('A'.repeat(41), 'id')).toMatch(/40/)
    expect(validateMessageText('Halo 👋', 'id')).toMatch(/tidak didukung/)
    expect(validateMessageText('café', 'id')).toMatch(/É/)
  })
})

describe('computeScores', () => {
  it('memberi poin kepada penebak dan pengirim', () => {
    const players = [
      { id: 'a', nickname: 'Alfa' },
      { id: 'b', nickname: 'Bravo' },
      { id: 'c', nickname: 'Charlie' },
    ]
    // Pesan milik a ditebak oleh b dan c; pesan milik b ditebak oleh c
    const scores = computeScores(players, [
      { guesserId: 'b', senderId: 'a' },
      { guesserId: 'c', senderId: 'a' },
      { guesserId: 'c', senderId: 'b' },
    ])
    const byId = Object.fromEntries(scores.map((s) => [s.playerId, s.points]))
    expect(byId).toEqual({ a: 2, b: 2, c: 2 })
    expect(scores.map((s) => s.nickname)).toEqual(['Alfa', 'Bravo', 'Charlie'])
  })

  it('menampilkan pemain tanpa poin dengan nilai 0', () => {
    const scores = computeScores([{ id: 'a', nickname: 'Alfa' }], [])
    expect(scores).toEqual([{ playerId: 'a', nickname: 'Alfa', points: 0, guessed: 0, decodedBy: 0 }])
  })
})
