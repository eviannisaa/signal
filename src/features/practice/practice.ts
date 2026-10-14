import { z } from 'zod'

import { MORSE_VIEWS, encode, isSameAnswer, looksLikeMorse, normalizeMorse, normalizeText, unsupportedChars } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { randomPrompt } from '#/lib/prompts'
import type { PromptLevel } from '#/lib/prompts'
import type { Locale } from '#/lib/i18n'
import { practiceMessages } from './messages'

export type PracticeMode = 'encode' | 'decode'

/** Pilihan tampilan soal decode: salah satu MORSE_VIEWS atau "random" (Acak). */
export type ViewChoice = MorseView | 'random'

export const VIEW_CHOICES = [...MORSE_VIEWS, 'random'] as const satisfies readonly ViewChoice[]
export const viewChoiceSchema = z.enum(VIEW_CHOICES)
export const promptLevelSchema = z.enum(['letter', 'short', 'long'])
export const practiceModeSchema = z.enum(['encode', 'decode'])

/** Nilai localStorage yang tidak valid atau tidak tersedia kembali ke "Acak". */
export function parseViewChoice(raw: unknown): ViewChoice {
  const parsed = viewChoiceSchema.safeParse(raw)
  return parsed.success ? parsed.data : 'random'
}

export interface PracticeQuestion {
  mode: PracticeMode
  level: PromptLevel
  /** Teks soal (huruf atau kata). Di mode decode tidak pernah ditampilkan sebelum menjawab. */
  prompt: string
  /** Kode Morse dari prompt. */
  code: string
  /** View yang dipakai untuk soal decode (null untuk encode). */
  view: MorseView | null
}

export function pickView(choice: ViewChoice, random: () => number = Math.random): MorseView {
  if (choice !== 'random') return choice
  return MORSE_VIEWS[Math.floor(random() * MORSE_VIEWS.length)]
}

/** Membuat soal acak. Soal yang sama dengan soal sebelumnya dihindari bila memungkinkan. */
export function createQuestion(
  mode: PracticeMode,
  level: PromptLevel,
  choice: ViewChoice,
  options: { previous?: string; random?: () => number } = {},
): PracticeQuestion {
  const random = options.random ?? Math.random
  let prompt = randomPrompt(level, random)
  for (let i = 0; i < 5 && prompt === options.previous; i++) prompt = randomPrompt(level, random)
  return {
    mode,
    level,
    prompt,
    code: encode(prompt),
    view: mode === 'decode' ? pickView(choice, random) : null,
  }
}

export type CheckResult =
  | { ok: true; correct: boolean; given: string; expected: string }
  | { ok: false; error: string }

/**
 * Menilai jawaban di browser. Encode: input berupa kode Morse (variasi simbol dinormalisasi).
 * Decode: input berupa teks (huruf besar/kecil dan spasi berlebih diabaikan).
 */
export function checkAnswer(question: PracticeQuestion, input: string, locale: Locale): CheckResult {
  const t = practiceMessages[locale].errors
  if (!input.trim()) return { ok: false, error: t.empty }
  if (question.mode === 'encode') {
    if (!looksLikeMorse(input)) return { ok: false, error: t.morseFormat }
    const given = normalizeMorse(input)
    return { ok: true, correct: isSameAnswer(given, question.code), given, expected: question.code }
  }
  const bad = unsupportedChars(input)
  if (bad.length > 0) return { ok: false, error: t.unsupported(bad.join(' ')) }
  const given = normalizeText(input)
  return { ok: true, correct: isSameAnswer(given, question.prompt), given, expected: question.prompt }
}

export interface SessionStats {
  answered: number
  correct: number
  streak: number
  best: number
}

export const EMPTY_STATS: SessionStats = { answered: 0, correct: 0, streak: 0, best: 0 }

export function recordAnswer(stats: SessionStats, correct: boolean): SessionStats {
  const streak = correct ? stats.streak + 1 : 0
  return {
    answered: stats.answered + 1,
    correct: stats.correct + (correct ? 1 : 0),
    streak,
    best: Math.max(stats.best, streak),
  }
}

/** Akurasi 0..1 (0 jika belum ada jawaban). */
export function accuracy(stats: SessionStats): number {
  return stats.answered === 0 ? 0 : stats.correct / stats.answered
}

/** Mengedit input Morse dari tombol bantu: menambah simbol, pemisah, atau menghapus. */
export function editMorseInput(value: string, action: '.' | '-' | 'letter' | 'word' | 'backspace' | 'clear'): string {
  switch (action) {
    case '.':
    case '-':
      return value + action
    case 'letter':
      return value.trim() === '' || /[ /]$/.test(value) ? value : value + ' '
    case 'word': {
      const base = value.replace(/\s+$/, '')
      if (base === '' || base.endsWith('/')) return value
      return base + ' / '
    }
    case 'backspace':
      return value.endsWith(' / ') ? value.slice(0, -3) : value.slice(0, -1)
    case 'clear':
      return ''
  }
}
