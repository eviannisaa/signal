import { describe, expect, it } from 'vitest'

import { gradeQuiz, scoreRatio } from './grade'
import type { AnswerKey } from './grade'
import { appendMorse, backspaceMorse } from './morse-input'

const keys: AnswerKey[] = [
  { id: 1, type: 'encode', answer: '... --- ...' },
  { id: 2, type: 'decode', answer: 'TERIMA KASIH' },
  { id: 3, type: 'encode', answer: '.' },
  { id: 4, type: 'decode', answer: 'E' },
]

describe('gradeQuiz', () => {
  it('menilai semua benar', () => {
    const r = gradeQuiz(keys, [
      { questionId: 1, answer: '... --- ...' },
      { questionId: 2, answer: 'terima kasih' },
      { questionId: 3, answer: '.' },
      { questionId: 4, answer: 'e' },
    ])
    expect(r.score).toBe(4)
    expect(r.total).toBe(4)
    expect(r.results.every((x) => x.isCorrect)).toBe(true)
  })

  it('menerima variasi simbol dan spasi berlebih', () => {
    const r = gradeQuiz(keys, [
      { questionId: 1, answer: '  ···   ———  ··· ' },
      { questionId: 2, answer: '  Terima    Kasih ' },
    ])
    expect(r.results[0].isCorrect).toBe(true)
    expect(r.results[1].isCorrect).toBe(true)
    expect(r.results[0].answer).toBe('···   ———  ···')
  })

  it('menghitung jawaban kosong atau tidak ada sebagai salah', () => {
    const r = gradeQuiz(keys, [{ questionId: 1, answer: '   ' }])
    expect(r.score).toBe(0)
    expect(r.total).toBe(4)
    expect(r.results.map((x) => x.answer)).toEqual(['', '', '', ''])
    expect(r.results.every((x) => !x.isCorrect)).toBe(true)
  })

  it('tidak menerima teks untuk soal encode atau kode untuk soal decode', () => {
    const r = gradeQuiz(keys, [
      { questionId: 3, answer: 'E' },
      { questionId: 4, answer: '.' },
    ])
    expect(r.results[2].isCorrect).toBe(false)
    expect(r.results[3].isCorrect).toBe(false)
  })

  it('mengabaikan jawaban untuk soal yang tidak ada di kunci dan mengikuti urutan kunci', () => {
    const r = gradeQuiz(keys, [
      { questionId: 99, answer: 'x' },
      { questionId: 4, answer: 'E' },
    ])
    expect(r.results.map((x) => x.questionId)).toEqual([1, 2, 3, 4])
    expect(r.score).toBe(1)
  })

  it('membedakan jeda huruf', () => {
    const r = gradeQuiz(keys, [{ questionId: 1, answer: '.........' }])
    expect(r.results[0].isCorrect).toBe(false)
  })
})

describe('scoreRatio', () => {
  it('aman untuk total nol dan membatasi 0..1', () => {
    expect(scoreRatio(0, 0)).toBe(0)
    expect(scoreRatio(3, 4)).toBe(0.75)
    expect(scoreRatio(5, 4)).toBe(1)
  })
})

describe('morse input helpers', () => {
  it('menambah simbol dan jeda dengan benar', () => {
    let v = ''
    v = appendMorse(v, 'letter')
    expect(v).toBe('')
    v = appendMorse(v, '.')
    v = appendMorse(v, '-')
    v = appendMorse(v, 'letter')
    v = appendMorse(v, 'letter')
    expect(v).toBe('.- ')
    v = appendMorse(v, 'word')
    expect(v).toBe('.- / ')
    expect(appendMorse(v, 'word')).toBe('.- / ')
    expect(appendMorse(v, 'letter')).toBe('.- / ')
  })

  it('menghapus jeda kata sekaligus', () => {
    expect(backspaceMorse('.- / ')).toBe('.-')
    expect(backspaceMorse('.-')).toBe('.')
    expect(backspaceMorse('')).toBe('')
  })
})
