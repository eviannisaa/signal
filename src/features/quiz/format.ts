import { INTL_LOCALE } from '#/lib/i18n/locale'
import type { Locale } from '#/lib/i18n/locale'

/** Format waktu tetap di zona WIB agar hasil SSR dan browser sama. */
const DATE_TIME: Record<Locale, Intl.DateTimeFormat> = {
  id: new Intl.DateTimeFormat(INTL_LOCALE.id, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }),
  en: new Intl.DateTimeFormat(INTL_LOCALE.en, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }),
}

const PERCENT: Record<Locale, Intl.NumberFormat> = {
  id: new Intl.NumberFormat(INTL_LOCALE.id, { style: 'percent', maximumFractionDigits: 0 }),
  en: new Intl.NumberFormat(INTL_LOCALE.en, { style: 'percent', maximumFractionDigits: 0 }),
}

export function formatDateTime(iso: string, locale: Locale): string {
  return `${DATE_TIME[locale].format(new Date(iso))} WIB`
}

export function formatPercent(score: number, total: number, locale: Locale): string {
  return PERCENT[locale].format(total > 0 ? Math.round((score / total) * 100) / 100 : 0)
}
