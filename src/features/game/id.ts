import { z } from 'zod'

/** 62 karakter base62. */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export const GAME_ID_LENGTH = 12
export const GAME_ID_REGEX = /^[A-Za-z0-9]{12}$/

/** Schema Zod untuk ID game, dipakai di semua Server Function game sebelum query ke database. */
export const gameIdSchema = z.string().regex(GAME_ID_REGEX, 'Kode game tidak valid.')

function defaultRandom(buf: Uint8Array<ArrayBuffer>): Uint8Array {
  crypto.getRandomValues(buf)
  return buf
}

/** Nilai byte terbesar yang masih dibagi rata ke 62 karakter (62 × 4 = 248), agar tidak bias. */
const MAX_UNBIASED = 248

/**
 * Membuat ID game 12 karakter base62 (sekitar 71 bit acak) dengan crypto.getRandomValues.
 * Byte ≥ 248 dibuang agar setiap karakter memiliki peluang yang sama.
 */
export function generateGameId(getRandomValues: (buf: Uint8Array<ArrayBuffer>) => Uint8Array = defaultRandom): string {
  let id = ''
  while (id.length < GAME_ID_LENGTH) {
    const bytes = getRandomValues(new Uint8Array(GAME_ID_LENGTH * 2))
    for (const b of bytes) {
      if (b >= MAX_UNBIASED) continue
      id += ALPHABET[b % ALPHABET.length]
      if (id.length === GAME_ID_LENGTH) break
    }
  }
  return id
}

export function isValidGameId(value: unknown): boolean {
  return typeof value === 'string' && GAME_ID_REGEX.test(value)
}

/**
 * Mengambil ID game dari link (https://…/g/<id>, /g/<id>) atau dari kode 12 karakter.
 * Mengembalikan null jika tidak ada ID yang valid.
 */
export function parseGameInput(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  if (GAME_ID_REGEX.test(value)) return value
  const match = value.match(/(?:^|\/)g\/([A-Za-z0-9]+)(?:[/?#]|$)/)
  if (match && GAME_ID_REGEX.test(match[1])) return match[1]
  return null
}
