import { createServerOnlyFn } from '@tanstack/react-start'
import { getCookie, getRequestHeaders } from '@tanstack/react-start/server'

import { LOCALE_COOKIE, resolveLocale } from './locale'
import type { Locale } from './locale'

/** Bahasa permintaan saat ini. Dipakai Server Function untuk konten dari database dan pesan error. */
export const readLocale = createServerOnlyFn((): Locale => resolveLocale(getCookie(LOCALE_COOKIE), getRequestHeaders().get('accept-language')))
