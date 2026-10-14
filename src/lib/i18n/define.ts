import type { Locale } from './locale'

/**
 * Kamus satu fitur dalam dua bahasa. Bentuk `en` wajib sama dengan `id`, sehingga kunci yang terlewat
 * atau salah tulis langsung menjadi error TypeScript. Teks berparameter ditulis sebagai fungsi.
 */
export function defineMessages<T>(messages: { id: T; en: NoInfer<T> }): Record<Locale, T> {
  return messages
}
