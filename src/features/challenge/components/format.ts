import { INTL_LOCALE } from '#/lib/i18n'
import type { Locale } from '#/lib/i18n'

import { challengeMessages } from '../messages'

/** Durasi dalam detik dengan satu angka desimal, misalnya "42,3 detik". */
export function formatDuration(ms: number, locale: Locale): string {
  return challengeMessages[locale].duration((ms / 1000).toLocaleString(INTL_LOCALE[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
}

/** Sisa waktu sebagai mm:ss untuk layar timer digital. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
