/**
 * Membaca ketukan kunci telegraf menjadi kode Morse berdasarkan durasi.
 * Semua ambang memakai satuan unit (lihat unitMs) agar mengikuti kecepatan.
 */

/** Tekanan kurang dari 2 unit dibaca sebagai dot, selebihnya dash. */
export const DASH_THRESHOLD_UNITS = 2
/** Diam selama 3 unit menutup huruf. */
export const LETTER_GAP_UNITS = 3
/** Diam selama 7 unit menutup kata. */
export const WORD_GAP_UNITS = 7

export type KeyedSymbol = '.' | '-'

export function classifyPress(durationMs: number, unit: number): KeyedSymbol {
  return durationMs < DASH_THRESHOLD_UNITS * unit ? '.' : '-'
}

export type GapKind = 'symbol' | 'letter' | 'word'

export function classifyGap(durationMs: number, unit: number): GapKind {
  if (durationMs < LETTER_GAP_UNITS * unit) return 'symbol'
  if (durationMs < WORD_GAP_UNITS * unit) return 'letter'
  return 'word'
}

/** Satu potongan pita: sinyal menyala (tekan) atau diam, dengan durasi aslinya. */
export interface TapeMark {
  on: boolean
  ms: number
}

/** Mark dari kode yang sempurna, untuk pita telegram masuk dan contoh kirim. */
export function marksFromTimings(timings: { on: boolean; units: number }[], unit: number): TapeMark[] {
  return timings.map((t) => ({ on: t.on, ms: t.units * unit }))
}
