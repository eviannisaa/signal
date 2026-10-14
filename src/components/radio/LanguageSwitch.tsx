import { LOCALES, LOCALE_LABELS, useLocale, useSetLocale, useT } from '#/lib/i18n'
import { cn } from '#/lib/utils'
import { shellMessages } from './messages'

/** Pemilih bahasa ID/EN bergaya sakelar kanal: segmen aktif terisi, seperti pemilih tampilan Morse. */
export function LanguageSwitch({ className }: { className?: string }) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const t = useT(shellMessages)
  return (
    <div role="group" aria-label={t.language} className={cn('flex items-center rounded-md border border-white/10 bg-black/20 p-0.5', className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          aria-label={LOCALE_LABELS[l]}
          title={LOCALE_LABELS[l]}
          onClick={() => locale !== l && setLocale(l)}
          className={cn(
            'radio-label rounded-[5px] px-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-cyan',
            locale === l ? 'bg-white/10 text-signal-offwhite' : 'text-signal-offwhite/45 hover:text-signal-offwhite',
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
