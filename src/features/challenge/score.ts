import { isSameAnswer } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'

import type { ChallengeQuestionType } from './generate'

/** Batas waktu tantangan dan toleransi latensi, keduanya diukur di server. */
export const TIME_LIMIT_SEC = 90
export const TOLERANCE_SEC = 10

export interface RoundKey {
  position: number
  type: ChallengeQuestionType
  prompt: string
  answer: string
  view: MorseView | null
}

export interface QuestionResult {
  position: number
  type: ChallengeQuestionType
  prompt: string
  view: MorseView | null
  given: string
  expected: string
  correct: boolean
}

/** true jika submit melewati batas waktu ditambah toleransi. */
export function isLateSubmit(startedAt: Date, submittedAt: Date, limitSec = TIME_LIMIT_SEC, toleranceSec = TOLERANCE_SEC): boolean {
  return submittedAt.getTime() - startedAt.getTime() > (limitSec + toleranceSec) * 1000
}

/**
 * Menilai jawaban dengan isSameAnswer dari lib/morse. Jawaban untuk posisi yang
 * tidak ada di ronde diabaikan; soal tanpa jawaban dianggap salah.
 * Jika late, semua soal tetap dikoreksi tetapi score menjadi 0.
 */
export function gradeChallenge(rounds: RoundKey[], answers: { position: number; answer: string }[], late = false) {
  const given = new Map<number, string>()
  for (const a of answers) if (!given.has(a.position)) given.set(a.position, a.answer)
  const results: QuestionResult[] = [...rounds]
    .sort((a, b) => a.position - b.position)
    .map((r) => {
      const answer = (given.get(r.position) ?? '').trim()
      return {
        position: r.position,
        type: r.type,
        prompt: r.prompt,
        view: r.view,
        given: answer,
        expected: r.answer,
        correct: answer.length > 0 && isSameAnswer(answer, r.answer),
      }
    })
  const correctCount = results.filter((r) => r.correct).length
  return { score: late ? 0 : correctCount, total: rounds.length, results }
}
