import { forwardRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Delete, Eraser } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { normalizeMorse, toDisplay } from '#/lib/morse'
import { MorseSymbols } from '#/components/radio/primitives'
import { appendMorse, backspaceMorse } from '../morse-input'
import type { MorseToken } from '../morse-input'
import { quizMessages } from '../messages'

const ALLOWED = /[^.\-/ ·•∙—–−_|]/g

const helperBtn =
  'inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-signal-offwhite transition hover:bg-white/10 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan motion-reduce:active:scale-100'

/** Input kode Morse dengan tombol bantu titik, strip, jeda huruf, dan jeda kata. */
export const MorseAnswerInput = forwardRef<
  HTMLInputElement,
  { id: string; value: string; onChange: (v: string) => void; onEnter?: () => void; describedBy?: string }
>(function MorseAnswerInput({ id, value, onChange, onEnter, describedBy }, ref) {
  const push = (t: MorseToken) => onChange(appendMorse(value, t))
  const clean = normalizeMorse(value)
  const t = useT(quizMessages).input

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter?.()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(ALLOWED, ''))}
        onKeyDown={onKeyDown}
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-describedby={describedBy}
        placeholder={t.placeholder}
        className="h-14 w-full rounded-xl border border-white/15 bg-black/20 px-4 font-mono text-2xl tracking-[0.2em] text-signal-offwhite outline-none placeholder:text-base placeholder:tracking-normal placeholder:text-signal-offwhite/35 focus-visible:border-signal-cyan focus-visible:ring-[3px] focus-visible:ring-signal-cyan/30"
      />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.helpers}>
        <button type="button" className={cn(helperBtn, 'w-16')} onClick={() => push('.')} aria-label={t.addDot}>
          <span className="size-3 rounded-full bg-morse-dot" aria-hidden="true" />
        </button>
        <button type="button" className={cn(helperBtn, 'w-16')} onClick={() => push('-')} aria-label={t.addDash}>
          <span className="h-3 w-8 rounded-full bg-morse-dash" aria-hidden="true" />
        </button>
        <button type="button" className={helperBtn} onClick={() => push('letter')}>
          {t.letterGap}
        </button>
        <button type="button" className={helperBtn} onClick={() => push('word')}>
          {t.wordGap}
        </button>
        <span className="flex gap-2 sm:ml-auto">
          <button type="button" className={helperBtn} onClick={() => onChange(backspaceMorse(value))} aria-label={t.backspace}>
            <Delete className="size-4" aria-hidden="true" />
          </button>
          <button type="button" className={helperBtn} onClick={() => onChange('')} aria-label={t.clear}>
            <Eraser className="size-4" aria-hidden="true" />
          </button>
        </span>
      </div>
      <div className="flex min-h-16 flex-col justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/15 px-4 py-3">
        <span className="radio-label text-signal-offwhite/45">{t.preview}</span>
        {clean ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <MorseSymbols code={clean} size="sm" />
            <span className="font-mono text-sm text-signal-offwhite/60" aria-hidden="true">
              {toDisplay(clean)}
            </span>
          </div>
        ) : (
          <span className="text-sm text-signal-offwhite/45">{t.empty}</span>
        )}
      </div>
    </div>
  )
})
