import { describe, expect, it } from 'vitest'

import { gradeChallenge, isLateSubmit } from './score'
import type { RoundKey } from './score'

const rounds: RoundKey[] = [
  { position: 0, type: 'encode', prompt: 'SOS', answer: '... --- ...', view: null },
  { position: 1, type: 'decode', prompt: '.... ..', answer: 'HI', view: 'audio' },
  { position: 2, type: 'decode', prompt: '- . .-', answer: 'TEA', view: 'chart' },
]

describe('gradeChallenge', () => {
  it('menilai dengan normalisasi jawaban', () => {
    const res = gradeChallenge(rounds, [
      { position: 0, answer: '··· ——— ···' },
      { position: 1, answer: ' hi ' },
      { position: 2, answer: 'TEE' },
    ])
    expect(res.score).toBe(2)
    expect(res.total).toBe(3)
    expect(res.results.map((r) => r.correct)).toEqual([true, true, false])
    expect(res.results[2]).toMatchObject({ given: 'TEE', expected: 'TEA', view: 'chart' })
  })

  it('menganggap soal tanpa jawaban salah dan mengabaikan posisi asing', () => {
    const res = gradeChallenge(rounds, [{ position: 9, answer: 'X' }, { position: 1, answer: '' }])
    expect(res.score).toBe(0)
    expect(res.results).toHaveLength(3)
  })

  it('memakai jawaban pertama jika posisi dikirim dua kali', () => {
    const res = gradeChallenge(rounds, [
      { position: 1, answer: 'HI' },
      { position: 1, answer: 'NO' },
    ])
    expect(res.score).toBe(1)
  })

  it('memberi score 0 untuk submit terlambat, tetapi tetap mengoreksi', () => {
    const res = gradeChallenge(rounds, [{ position: 1, answer: 'HI' }], true)
    expect(res.score).toBe(0)
    expect(res.results[1].correct).toBe(true)
  })
})

describe('isLateSubmit', () => {
  const start = new Date('2026-01-01T00:00:00Z')
  it('masih diterima hingga batas waktu ditambah toleransi', () => {
    expect(isLateSubmit(start, new Date(start.getTime() + 90_000))).toBe(false)
    expect(isLateSubmit(start, new Date(start.getTime() + 100_000))).toBe(false)
  })
  it('terlambat jika lewat dari toleransi', () => {
    expect(isLateSubmit(start, new Date(start.getTime() + 100_001))).toBe(true)
  })
})
