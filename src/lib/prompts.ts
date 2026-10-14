import { LETTERS } from './morse'

/** Kata pendek untuk Practice, Listening, dan Tantangan Morse. */
export const SHORT_WORDS = [
  'SOS', 'HI', 'OK', 'YES', 'NO', 'TEA', 'SUN', 'SEA', 'AIR', 'RED', 'BLUE', 'MAP',
  'KEY', 'CODE', 'DOT', 'DASH', 'RADIO', 'TONE', 'BEEP', 'LAMP', 'STAR', 'MOON',
] as const

/** Kata yang lebih panjang untuk tingkat lanjut. */
export const LONG_WORDS = [
  'SIGNAL', 'MORSE', 'STATION', 'CHANNEL', 'ANTENNA', 'MESSAGE', 'LISTEN',
  'PRACTICE', 'SAILOR', 'BEACON', 'CAPTAIN', 'HARBOR', 'TELEGRAPH',
] as const

export type PromptLevel = 'letter' | 'short' | 'long'

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length)]
}

/** Mengambil satu soal acak sesuai tingkat. */
export function randomPrompt(level: PromptLevel, random: () => number = Math.random): string {
  if (level === 'letter') return pick(LETTERS, random)
  if (level === 'short') return pick(SHORT_WORDS, random)
  return pick(LONG_WORDS, random)
}
