import { forwardRef } from 'react'
import type { ReactNode } from 'react'
import { Delete, Space } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/lib/i18n'
import { normalizeMorse, toSpoken } from '#/lib/morse'
import { MorseSymbols } from '#/components/radio/primitives'

import { challengeMessages } from '../messages'

type Token = '.' | '-' | 'letter' | 'word'

function append(current: string, token: Token): string {
  if (token === '.' || token === '-') return current + token
  const trimmed = current.trimEnd()
  if (!trimmed || trimmed.endsWith('/')) return current
  if (token === 'letter') return current.endsWith(' ') ? current : `${current} `
  return `${trimmed} / `
}

function backspace(current: string): string {
  if (current.endsWith(' / ')) return current.slice(0, -3)
  return current.slice(0, -1)
}

/** Menyamakan variasi simbol saat mengetik dan membuang karakter selain titik, strip, spasi, dan "/". */
function sanitize(raw: string): string {
  return raw
    .replace(/[•·∙⋅●*]/g, '.')
    .replace(/[–—−_]/g, '-')
    .replace(/[|]/g, '/')
    .replace(/[^.\-/ ]/g, '')
}

/**
 * Input kode Morse dengan tombol titik dan strip. Dapat dipakai dengan keyboard
 * (ketik "." dan "-", spasi untuk jeda huruf, "/" untuk jeda kata).
 */
export const MorseKeyInput = forwardRef<HTMLInputElement, { id: string; value: string; onChange: (value: string) => void; onEnter?: () => void; disabled?: boolean; describedBy?: string }>(
  function MorseKeyInput({ id, value, onChange, onEnter, disabled, describedBy }, ref) {
    const t = useT(challengeMessages).keyInput
    const locale = useLocale()
    const clean = normalizeMorse(value)
    const key = (token: Token) => onChange(append(value, token))
    return (
      <div className="flex flex-col gap-3">
        <input
          ref={ref}
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(sanitize(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onEnter?.()
            }
          }}
          inputMode="none"
          autoComplete="off"
          spellCheck={false}
          placeholder={t.placeholder}
          aria-describedby={describedBy}
          className="h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 font-mono text-lg tracking-[0.25em] text-signal-offwhite outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-signal-offwhite/35 focus-visible:ring-2 focus-visible:ring-signal-cyan"
        />
        <div className="flex min-h-9 items-center rounded-xl border border-dashed border-white/10 px-3 py-2" aria-live="polite">
          {clean ? <MorseSymbols code={clean} size="sm" /> : <span className="text-xs text-signal-offwhite/40">{t.previewEmpty}</span>}
          <span className="sr-only">{clean ? t.current(toSpoken(clean, locale)) : ''}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
          <KeyButton label={t.dot} onClick={() => key('.')} disabled={disabled} className="h-14">
            <span className="size-3.5 rounded-full bg-morse-dot" aria-hidden="true" />
          </KeyButton>
          <KeyButton label={t.dash} onClick={() => key('-')} disabled={disabled} className="h-14">
            <span className="h-3.5 w-10 rounded-full bg-morse-dash" aria-hidden="true" />
          </KeyButton>
          <KeyButton label={t.letterGap} onClick={() => key('letter')} disabled={disabled}>
            <Space className="size-4" aria-hidden="true" />
            <span className="text-xs">{t.letter}</span>
          </KeyButton>
          <KeyButton label={t.wordGap} onClick={() => key('word')} disabled={disabled}>
            <span className="font-mono text-sm" aria-hidden="true">/</span>
            <span className="text-xs">{t.word}</span>
          </KeyButton>
          <KeyButton label={t.backspace} onClick={() => onChange(backspace(value))} disabled={disabled || !value} className="col-span-2 sm:col-span-1">
            <Delete className="size-4" aria-hidden="true" />
          </KeyButton>
        </div>
      </div>
    )
  },
)

function KeyButton({ label, onClick, disabled, className, children }: { label: string; onClick: () => void; disabled?: boolean; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-signal-offwhite/85 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan motion-reduce:active:scale-100',
        className,
      )}
    >
      {children}
    </button>
  )
}
