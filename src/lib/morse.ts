/**
 * Logic Morse terpusat. Tabel kode, encode, decode, normalize, dan toTimings
 * tidak boleh diduplikasi di fitur lain.
 *
 * Format kode internal: "." untuk dot, "-" untuk dash, satu spasi di antara
 * huruf, dan " / " di antara kata.
 */

import type { Locale } from '#/lib/i18n/locale'

export const MORSE_TABLE: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  '"': '.-..-.',
  '@': '.--.-.',
}

const REVERSE_TABLE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([char, code]) => [code, char]),
)

export const LETTERS = Object.keys(MORSE_TABLE).filter((c) => /[A-Z]/.test(c))

/** Lima representasi Morse untuk soal (generate.ts, practice) dan validasi Zod. */
export const MORSE_VIEWS = [
  'audio',
  'light',
  'timeline',
  'chart',
  'text',
] as const

/**
 * Representasi yang tampil sebagai tab di MorseViewer. Signal Timeline (diganti Flag Signal), Morse Chart
 * (diganti Eye Signal), Heliograph (diganti Grass Cipher), serta Grass Cipher dan Text (diganti Mirror
 * Signal) disembunyikan dari tab tetapi tidak dihapus: masih bisa dirender lewat hideTabs.
 */
export const VIEWER_TABS = ['audio', 'light', 'flag', 'eye', 'mirror'] as const
export type ViewerTab = (typeof VIEWER_TABS)[number]

/** Semua representasi yang dapat dirender MorseViewer. */
export const ALL_VIEWS = [
  ...MORSE_VIEWS,
  'flag',
  'eye',
  'helio',
  'grass',
  'mirror',
] as const
export type MorseView = (typeof ALL_VIEWS)[number]

export const MORSE_VIEW_LABELS: Record<MorseView, string> = {
  audio: 'Audio Signal',
  light: 'Light Signal',
  timeline: 'Signal Timeline',
  chart: 'Morse Chart',
  text: 'Text',
  flag: 'Flag Signal',
  eye: 'Eye Signal',
  helio: 'Heliograph',
  grass: 'Grass Cipher',
  mirror: 'Mirror Signal',
}

/** Batas Light Signal: maksimal 3 kedipan per detik (sekitar 7 WPM). */
export const LIGHT_MAX_WPM = 7
/** Batas Eye Signal: satu titik sekitar 240 ms, mendekati kedipan mata alami (sekitar 5 WPM). */
export const EYE_MAX_WPM = 5
export const DEFAULT_WPM = 12
export const DEFAULT_FREQUENCY = 600

/** Durasi satu unit dalam milidetik untuk kecepatan tertentu (standar PARIS). */
export function unitMs(wpm: number): number {
  return 1200 / wpm
}

export interface TextToken {
  char: string
  code: string | null
}

/** Memecah teks per karakter beserta kodenya. Karakter tidak didukung bernilai null. */
export function tokenizeText(text: string): TextToken[] {
  return Array.from(text.toUpperCase()).map((char) => {
    if (/\s/.test(char)) return { char: ' ', code: '/' }
    return { char, code: MORSE_TABLE[char] ?? null }
  })
}

/** Karakter yang tidak dapat di-encode, tanpa duplikasi. */
export function unsupportedChars(text: string): string[] {
  const seen = new Set<string>()
  for (const t of tokenizeText(text)) if (t.code === null) seen.add(t.char)
  return [...seen]
}

/** Mengubah teks menjadi kode Morse. Karakter tidak didukung dilewati. */
export function encode(text: string): string {
  const words = text
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((word) =>
      Array.from(word)
        .map((c) => MORSE_TABLE[c])
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean)
  return words.join(' / ')
}

/** Menyamakan variasi input Morse: •·∙ menjadi ".", –—− menjadi "-", dan | menjadi "/". */
export function normalizeMorse(input: string): string {
  return input
    .replace(/[•·∙⋅●*]/g, '.')
    .replace(/[–—−_]/g, '-')
    .replace(/[|]/g, '/')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/[^.\-/ ]/g, '')
    .replace(/(\s*\/\s*)+/g, ' / ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .replace(/^\/\s*|\s*\/$/g, '')
    .trim()
}

/** Mengubah kode Morse menjadi teks. Urutan yang tidak ada di tabel menjadi "?". */
export function decode(code: string): string {
  const clean = normalizeMorse(code)
  if (!clean) return ''
  return clean
    .split(' / ')
    .map((word) =>
      word
        .split(' ')
        .filter(Boolean)
        .map((sym) => REVERSE_TABLE[sym] ?? '?')
        .join(''),
    )
    .join(' ')
}

/** Menyamakan teks jawaban: huruf besar, tanpa spasi berlebih. */
export function normalizeText(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ')
}

/** true jika input hanya berisi simbol Morse (termasuk variasinya). */
export function looksLikeMorse(input: string): boolean {
  return input.trim().length > 0 && /^[\s.\-/|•·∙⋅●*–—−_]+$/.test(input)
}

/** Normalisasi jawaban apa pun: Morse dinormalisasi sebagai kode, selain itu sebagai teks. */
export function normalize(input: string): string {
  return looksLikeMorse(input) ? normalizeMorse(input) : normalizeText(input)
}

/** Membandingkan dua jawaban dengan aturan normalisasi yang sama. */
export function isSameAnswer(given: string, expected: string): boolean {
  return normalize(given) === normalize(expected)
}

export interface Timing {
  on: boolean
  units: number
  symbol?: '.' | '-'
}

/**
 * Mengubah kode menjadi urutan on/off dalam satuan unit:
 * dot 1, dash 3, jeda simbol 1, jeda huruf 3, jeda kata 7.
 */
export function toTimings(code: string): Timing[] {
  const out: Timing[] = []
  const words = normalizeMorse(code).split(' / ').filter(Boolean)
  words.forEach((word, wi) => {
    if (wi > 0) out.push({ on: false, units: 7 })
    word
      .split(' ')
      .filter(Boolean)
      .forEach((letter, li) => {
        if (li > 0) out.push({ on: false, units: 3 })
        Array.from(letter).forEach((sym, si) => {
          if (si > 0) out.push({ on: false, units: 1 })
          out.push({
            on: true,
            units: sym === '.' ? 1 : 3,
            symbol: sym as '.' | '-',
          })
        })
      })
  })
  return out
}

export function totalUnits(timings: Timing[]): number {
  return timings.reduce((sum, t) => sum + t.units, 0)
}

/** Kode tampilan dengan simbol · dan —. */
export function toDisplay(code: string): string {
  return normalizeMorse(code).replace(/\./g, '·').replace(/-/g, '—')
}

/** Bacaan dit/dah untuk screen reader dan tampilan Text. */
export function toDitDah(code: string): string {
  return normalizeMorse(code)
    .split(' / ')
    .map((word) =>
      word
        .split(' ')
        .map((letter) =>
          Array.from(letter)
            .map((s) => (s === '.' ? 'dit' : 'dah'))
            .join(' '),
        )
        .join(', '),
    )
    .join(' — ')
}

const SPOKEN_SYMBOLS: Record<Locale, { dot: string; dash: string }> = {
  id: { dot: 'titik', dash: 'strip' },
  en: { dot: 'dot', dash: 'dash' },
}

/** Label aksesibel sesuai bahasa, misalnya "titik strip" atau "dot dash". */
export function toSpoken(code: string, locale: Locale = 'id'): string {
  const { dot, dash } = SPOKEN_SYMBOLS[locale]
  return toDitDah(code).replace(/dit/g, dot).replace(/dah/g, dash)
}

/** Kode Morse per huruf dari teks atau kode, dipakai Morse Chart per langkah. */
export function lettersOf(code: string): string[] {
  return normalizeMorse(code)
    .split(/ \/ | /)
    .filter(Boolean)
}
