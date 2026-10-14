/** Bahasa yang didukung. Bahasa Indonesia adalah bahasa utama aplikasi. */
export const LOCALES = ['id', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'id'

/** Cookie pilihan bahasa, dibaca server agar halaman langsung dirender dalam bahasa yang benar. */
export const LOCALE_COOKIE = 'signal-locale'

export const LOCALE_LABELS: Record<Locale, string> = { id: 'Bahasa Indonesia', en: 'English' }

/** Tag BCP 47 untuk Intl (format tanggal dan angka). */
export const INTL_LOCALE: Record<Locale, string> = { id: 'id-ID', en: 'en-US' }

export function isLocale(value: unknown): value is Locale {
  return value === 'id' || value === 'en'
}

/** Bahasa diambil dari cookie. Tanpa cookie, pengunjung dengan browser berbahasa Inggris mendapat bahasa Inggris. */
export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale {
  if (isLocale(cookie)) return cookie
  const first = acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? ''
  return first.startsWith('en') ? 'en' : DEFAULT_LOCALE
}
