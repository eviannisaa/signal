import { VIEWER_TABS, normalizeText, unsupportedChars } from '#/lib/morse'
import type { Locale } from '#/lib/i18n'

import { messageMessages } from './messages'

export const MAX_MESSAGE_LENGTH = 40
export const MAX_GUESS_ATTEMPTS = 3
export const SEND_COOLDOWN_MS = 5000
export const FEED_LIMIT = 50

/** Sinyal yang bisa dipilih pengirim: Text (hanya simbol Morse) lalu sinyal yang sama dengan tab Morse Explorer. */
export const MESSAGE_SIGNALS = ['text', ...VIEWER_TABS] as const
export type MessageSignal = (typeof MESSAGE_SIGNALS)[number]

export type MessageStatus = 'mine' | 'open' | 'correct' | 'failed'

/** Status pesan untuk pembaca tertentu. Teks asli hanya boleh dikirim jika status bukan "open". */
export function messageStatus(isMine: boolean, guess: { attempts: number; isCorrect: boolean } | undefined): MessageStatus {
  if (isMine) return 'mine'
  if (guess?.isCorrect) return 'correct'
  if (guess && guess.attempts >= MAX_GUESS_ATTEMPTS) return 'failed'
  return 'open'
}

export function attemptsLeft(guess: { attempts: number } | undefined): number {
  return Math.max(0, MAX_GUESS_ATTEMPTS - (guess?.attempts ?? 0))
}

/** Memeriksa teks pesan. Mengembalikan pesan error atau null jika valid. */
export function validateMessageText(text: string, locale: Locale): string | null {
  const t = messageMessages[locale].validation
  const clean = normalizeText(text)
  if (!clean) return t.empty
  if (clean.length > MAX_MESSAGE_LENGTH) return t.tooLong(MAX_MESSAGE_LENGTH)
  const bad = unsupportedChars(clean)
  if (bad.length) return t.unsupported(bad.join(' '))
  return null
}

/**
 * Menghitung score: penebak +1 untuk setiap pesan yang ditebak benar, dan pengirim
 * +1 untuk setiap pemain yang berhasil menebak pesannya.
 */
export function computeScores(
  players: { id: string; nickname: string }[],
  correctGuesses: { guesserId: string; senderId: string }[],
): { playerId: string; nickname: string; points: number; guessed: number; decodedBy: number }[] {
  const guessed = new Map<string, number>()
  const decodedBy = new Map<string, number>()
  for (const g of correctGuesses) {
    guessed.set(g.guesserId, (guessed.get(g.guesserId) ?? 0) + 1)
    decodedBy.set(g.senderId, (decodedBy.get(g.senderId) ?? 0) + 1)
  }
  return players
    .map((p) => {
      const a = guessed.get(p.id) ?? 0
      const b = decodedBy.get(p.id) ?? 0
      return { playerId: p.id, nickname: p.nickname, points: a + b, guessed: a, decodedBy: b }
    })
    .sort((x, y) => y.points - x.points || x.nickname.localeCompare(y.nickname))
}
