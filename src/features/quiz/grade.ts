import { isSameAnswer } from '#/lib/morse'

export interface AnswerKey {
  id: number
  type: 'encode' | 'decode'
  answer: string
}

export interface GivenAnswer {
  questionId: number
  answer: string
}

export interface GradedAnswer {
  questionId: number
  /** Jawaban pengguna setelah di-trim; string kosong jika tidak dijawab. */
  answer: string
  isCorrect: boolean
}

export interface GradeResult {
  results: GradedAnswer[]
  score: number
  total: number
}

/**
 * Menilai jawaban terhadap kunci. Fungsi murni: tidak menyentuh database.
 * Soal yang tidak dijawab atau dijawab kosong dihitung salah, bukan error.
 * Urutan hasil mengikuti urutan kunci.
 */
export function gradeQuiz(keys: AnswerKey[], answers: GivenAnswer[]): GradeResult {
  const given = new Map(answers.map((a) => [a.questionId, a.answer.trim()]))
  const results = keys.map((key) => {
    const answer = given.get(key.id) ?? ''
    return { questionId: key.id, answer, isCorrect: answer.length > 0 && isSameAnswer(answer, key.answer) }
  })
  return { results, score: results.filter((r) => r.isCorrect).length, total: keys.length }
}

/** Rasio score 0..1, aman untuk total 0. */
export function scoreRatio(score: number, total: number): number {
  return total > 0 ? Math.max(0, Math.min(1, score / total)) : 0
}
