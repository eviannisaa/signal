import { z } from 'zod'

import { MORSE_TABLE, normalizeMorse } from '#/lib/morse'
import type { KeyVoice } from '#/lib/morse-audio'
import type { PromptLevel } from '#/lib/prompts'

export const MIN_WPM = 5
export const MAX_WPM = 20

export type TelegraphMode = 'send' | 'receive'
/** "free" hanya untuk mode kirim: mengetuk bebas tanpa soal. */
export type TelegraphLevel = PromptLevel | 'free'

export interface TelegraphSettings {
  mode: TelegraphMode
  wpm: number
  level: TelegraphLevel
  voice: KeyVoice
}

/** Mengirim lebih sulit daripada mendengar, sehingga kecepatan awalnya lebih lambat. */
export const DEFAULT_SETTINGS: TelegraphSettings = {
  mode: 'send',
  wpm: 8,
  level: 'letter',
  voice: 'sounder',
}

/** Setiap field divalidasi sendiri, sehingga satu nilai rusak tidak menghapus pengaturan lain. */
const settingsSchema = z.object({
  mode: z.enum(['send', 'receive']).catch(DEFAULT_SETTINGS.mode),
  wpm: z.number().int().min(MIN_WPM).max(MAX_WPM).catch(DEFAULT_SETTINGS.wpm),
  level: z.enum(['letter', 'short', 'long', 'free']).catch(DEFAULT_SETTINGS.level),
  voice: z.enum(['tone', 'sounder']).catch(DEFAULT_SETTINGS.voice),
})

export function parseTelegraphSettings(raw: unknown): TelegraphSettings {
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

export interface LetterCheck {
  /** Huruf yang diminta. */
  char: string
  /** Kode yang benar untuk huruf ini. */
  expected: string
  /** Kode yang diketuk, null jika belum sampai huruf ini. */
  sent: string | null
  correct: boolean
}

/** Kode yang diketuk dipecah per huruf. Jeda kata diabaikan karena soal berupa satu kata. */
export function sentLetters(code: string): string[] {
  return normalizeMorse(code)
    .split(' ')
    .filter((t) => t !== '' && t !== '/')
}

/** Membandingkan ketukan dengan soal huruf per huruf. */
export function checkSent(target: string, code: string): LetterCheck[] {
  const sent = sentLetters(code)
  return Array.from(target.replace(/\s/g, '')).map((char, i) => {
    const expected = MORSE_TABLE[char] ?? ''
    const s = sent[i] ?? null
    return { char, expected, sent: s, correct: s === expected }
  })
}

/** true jika jumlah huruf yang sudah ditutup sama dengan panjang soal. */
export function isSendComplete(target: string, code: string): boolean {
  return sentLetters(code).length >= target.replace(/\s/g, '').length
}
