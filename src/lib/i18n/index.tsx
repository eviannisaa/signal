import { useCallback } from 'react'
import { useRouteContext, useRouter } from '@tanstack/react-router'

import { INTL_LOCALE, LOCALE_COOKIE } from './locale'
import type { Locale } from './locale'

export { defineMessages } from './define'
export { LOCALES, LOCALE_LABELS, INTL_LOCALE, isLocale } from './locale'
export type { Locale } from './locale'

/** Bahasa aktif, dari context root (dibaca server dari cookie). */
export function useLocale(): Locale {
  return useRouteContext({ from: '__root__', select: (c) => c.locale })
}

/** Kamus fitur dalam bahasa aktif: `const t = useT(authMessages)`. */
export function useT<T>(messages: Record<Locale, T>): T {
  return messages[useLocale()]
}

/** Tag Intl untuk bahasa aktif, misalnya untuk toLocaleString. */
export function useIntlLocale(): string {
  return INTL_LOCALE[useLocale()]
}

/** Mengganti bahasa: simpan di cookie selama setahun, lalu muat ulang data route agar konten server ikut berganti. */
export function useSetLocale() {
  const router = useRouter()
  return useCallback(
    async (locale: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
      document.documentElement.lang = locale
      await router.invalidate()
    },
    [router],
  )
}
