import { z } from 'zod'

import { DEFAULT_WPM, LIGHT_MAX_WPM } from '#/lib/morse'
import type { PromptLevel } from '#/lib/prompts'
import type { Locale } from '#/lib/i18n'
import { listeningMessages } from './messages'

export const MIN_WPM = 5
export const MAX_WPM = 20

export type QuestionSignal = 'audio' | 'light'

export interface ListeningSettings {
  wpm: number
  level: PromptLevel
  signal: QuestionSignal
}

export const DEFAULT_SETTINGS: ListeningSettings = { wpm: DEFAULT_WPM, level: 'letter', signal: 'audio' }

/** Setiap field divalidasi sendiri, sehingga satu nilai rusak tidak menghapus pengaturan lain. */
export const listeningSettingsSchema = z.object({
  wpm: z.number().int().min(MIN_WPM).max(MAX_WPM).catch(DEFAULT_SETTINGS.wpm),
  level: z.enum(['letter', 'short', 'long']).catch(DEFAULT_SETTINGS.level),
  signal: z.enum(['audio', 'light']).catch(DEFAULT_SETTINGS.signal),
})

export function parseListeningSettings(raw: unknown): ListeningSettings {
  const parsed = listeningSettingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : DEFAULT_SETTINGS
}

/** Kecepatan yang benar-benar dipakai: Light Signal dibatasi maksimal 3 kedipan per detik. */
export function effectiveWpm(signal: QuestionSignal, wpm: number): number {
  return signal === 'light' ? Math.min(wpm, LIGHT_MAX_WPM) : wpm
}

/** Label sederhana untuk pemula yang belum mengenal istilah WPM. */
export function speedLabel(wpm: number, locale: Locale): string {
  const t = listeningMessages[locale].speed
  if (wpm <= 8) return t.slow
  if (wpm <= 14) return t.medium
  return t.fast
}
