import { MORSE_TABLE, decode, encode, normalizeMorse, tokenizeText, unsupportedChars } from '#/lib/morse'
import type { TextToken } from '#/lib/morse'

export const TRANSLATE_DIRECTIONS = ['text-to-morse', 'morse-to-text'] as const
export type TranslateDirection = (typeof TRANSLATE_DIRECTIONS)[number]

/** Batas input agar waveform dan audio tetap ringan. */
export const MAX_INPUT_LENGTH = 500

/** Satu huruf hasil decode. char bernilai null jika urutannya tidak ada di tabel. */
export interface DecodedLetter {
  code: string
  char: string | null
}

export interface TranslateResult {
  direction: TranslateDirection
  /** Kode Morse ternormalisasi ('.', '-', ' ', ' / '). */
  code: string
  /** Teks hasil decode, atau teks input (huruf besar) untuk arah TEKS → MORSE. */
  text: string
  /** Token per karakter untuk arah TEKS → MORSE. */
  tokens: TextToken[]
  /** Kata dan huruf hasil decode untuk arah MORSE → TEKS. */
  words: DecodedLetter[][]
  /** Karakter teks yang tidak didukung, atau karakter non-Morse pada input Morse. */
  unsupported: string[]
  /** Jumlah urutan Morse yang tidak ada di tabel. */
  invalidCount: number
}

const MORSE_INPUT_CHAR = /[\s.\-/|•·∙⋅●*–—−_]/

/** Karakter pada input Morse yang bukan simbol Morse (diabaikan saat decode). */
export function nonMorseChars(input: string): string[] {
  const seen = new Set<string>()
  for (const c of Array.from(input)) if (!MORSE_INPUT_CHAR.test(c)) seen.add(c)
  return [...seen]
}

/** Memecah kode Morse menjadi kata dan huruf, menandai urutan yang tidak valid. */
export function decodeLetters(code: string): DecodedLetter[][] {
  const clean = normalizeMorse(code)
  if (!clean) return []
  return clean.split(' / ').map((word) =>
    word
      .split(' ')
      .filter(Boolean)
      .map((letter) => {
        const char = decode(letter)
        // decode mengembalikan "?" untuk urutan tidak dikenal; "?" juga karakter valid (..--..).
        const valid = char !== '?' || letter === MORSE_TABLE['?']
        return { code: letter, char: valid ? char : null }
      }),
  )
}

/** Menerjemahkan input sesuai arah yang dipilih. Input dipotong ke batas maksimum. */
export function translate(rawInput: string, direction: TranslateDirection): TranslateResult {
  const input = rawInput.slice(0, MAX_INPUT_LENGTH)
  if (direction === 'text-to-morse') {
    const compact = input.trim().replace(/\s+/g, ' ')
    return {
      direction,
      code: encode(input),
      text: compact.toUpperCase(),
      tokens: tokenizeText(compact),
      words: [],
      unsupported: unsupportedChars(input),
      invalidCount: 0,
    }
  }
  const code = normalizeMorse(input)
  const words = decodeLetters(code)
  return {
    direction,
    code,
    text: decode(code),
    tokens: [],
    words,
    unsupported: nonMorseChars(input),
    invalidCount: words.flat().filter((l) => l.char === null).length,
  }
}

/** Teks yang disalin: kode Morse standar untuk TEKS → MORSE, teks untuk MORSE → TEKS. */
export function copyValue(result: TranslateResult): string {
  return result.direction === 'text-to-morse' ? result.code : result.text
}

/** Input baru saat arah ditukar: hasil terjemahan menjadi input. */
export function swapInput(result: TranslateResult): string {
  if (result.direction === 'text-to-morse') return result.code.slice(0, MAX_INPUT_LENGTH)
  // Urutan tidak valid tidak ikut ditukar agar "?" tidak berubah menjadi kode tanda tanya.
  return result.words
    .map((word) => word.map((l) => l.char ?? '').join(''))
    .filter(Boolean)
    .join(' ')
    .slice(0, MAX_INPUT_LENGTH)
}
