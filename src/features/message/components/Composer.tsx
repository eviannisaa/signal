import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AlertCircle, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import {
  MORSE_VIEW_LABELS,
  encode,
  normalizeText,
  unsupportedChars,
} from '#/lib/morse'
import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { MorseSlashed, RadioPanel } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'

import { sendMessage } from '../server'
import { MAX_MESSAGE_LENGTH, MESSAGE_SIGNALS, SEND_COOLDOWN_MS } from '../score'
import type { MessageSignal } from '../score'
import { messageMessages } from '../messages'

/** Form pesan dengan preview kode Morse langsung saat mengetik. */
export function Composer({
  gameId,
  disabled,
  onSent,
}: {
  gameId: string
  disabled?: boolean
  onSent: () => void
}) {
  const m = useT(messageMessages)
  const t = m.composer
  const send = useServerFn(sendMessage)
  const [text, setText] = useState('')
  const [pending, setPending] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  // Sinyal pesan, default Text; pesan tampil kepada penebak dalam sinyal ini
  const [signal, setSignal] = useState<MessageSignal>('text')
  const [now, setNow] = useState(() => Date.now())
  const inputId = useId()
  const errorId = useId()
  const countId = useId()

  const clean = normalizeText(text)
  const bad = unsupportedChars(clean)
  const tooLong = clean.length > MAX_MESSAGE_LENGTH
  const code = encode(clean)
  const waitSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000))
  const problem = bad.length
    ? m.validation.unsupported(bad.join(' '))
    : tooLong
      ? m.validation.tooLong(MAX_MESSAGE_LENGTH)
      : null
  const canSend = !disabled && !pending && !!clean && !problem && waitSec === 0

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [cooldownUntil])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSend) return
    setPending(true)
    try {
      await send({ data: { gameId, text: clean, signal } })
      setText('')
      setSignal('text')
      setCooldownUntil(Date.now() + SEND_COOLDOWN_MS)
      setNow(Date.now())
      toast.success(t.sent)
      onSent()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t.sendFailed,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <RadioPanel
      channel="TX"
      title={t.title}
      led={pending ? 'blink' : true}
      actions={
        <span className="font-mono text-[0.68rem] text-signal-offwhite/45">
          {t.maxChars(MAX_MESSAGE_LENGTH)}
        </span>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label
              htmlFor={inputId}
              className="radio-label text-signal-offwhite/70"
            >
              {t.label}
            </label>
            <span
              id={countId}
              className={
                tooLong
                  ? 'font-mono text-xs text-red-300'
                  : 'font-mono text-xs text-signal-offwhite/50'
              }
            >
              {clean.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <Input
            id={inputId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            maxLength={MAX_MESSAGE_LENGTH + 10}
            autoComplete="off"
            placeholder={
              disabled
                ? t.placeholderDisabled
                : t.placeholder
            }
            aria-invalid={!!problem}
            aria-describedby={problem ? `${errorId} ${countId}` : countId}
            className="h-12 rounded-xl border-white/15 bg-black/25 font-mono text-base tracking-wide text-signal-offwhite uppercase placeholder:normal-case placeholder:text-signal-offwhite/35"
          />
          {problem && (
            <p
              id={errorId}
              role="alert"
              className="flex items-start gap-2 text-sm text-red-300"
            >
              <AlertCircle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {problem}
            </p>
          )}
        </div>

        {/* Pilihan sinyal: gaya sama seperti pemilih tab di Morse Explorer */}
        <fieldset className="flex flex-col gap-2" disabled={disabled}>
          <legend className="radio-label mb-2 text-signal-offwhite/70">
            {t.signalLegend}
          </legend>
          <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-1">
            {MESSAGE_SIGNALS.map((v, i) => {
              const active = signal === v
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  aria-label={MORSE_VIEW_LABELS[v]}
                  onClick={() => setSignal(v)}
                  className={cn(
                    'flex flex-1 shrink-0 items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan disabled:opacity-40',
                    active
                      ? 'bg-white/10 text-signal-offwhite ring-1 ring-white/10'
                      : 'text-signal-offwhite/55 hover:text-signal-offwhite',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'text-[10px]',
                      active ? 'text-signal-cyan' : 'text-signal-offwhite/35',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {MORSE_VIEW_LABELS[v].replace(/ Signal$/, '')}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Pratinjau mengikuti sinyal yang dipilih: Text berupa sandi Morse, sinyal lain berupa pemutar */}
        <div
          className="rounded-xl border border-white/10 bg-black/20 p-4"
          aria-live="polite"
        >
          <p className="radio-label mb-3 text-signal-offwhite/50">
            {t.preview(MORSE_VIEW_LABELS[signal])}
          </p>
          {code &&
            (signal === 'text' ? (
              <MorseSlashed code={code} />
            ) : (
              <MorseViewer
                key={signal}
                value={code}
                view={signal}
                mode="question"
                hideTabs
                compact
                className="rounded-none! border-0! bg-transparent! bg-none! shadow-none! backdrop-blur-none! [&>[role=tabpanel]]:min-h-0! [&>[role=tabpanel]]:p-0!"
              />
            ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-signal-offwhite/50">
            {signal === 'text'
              ? t.hintText
              : t.hintSignal(MORSE_VIEW_LABELS[signal])}
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={!canSend}
            className="h-11 rounded-xl px-5"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            {waitSec > 0
              ? t.wait(waitSec)
              : pending
                ? t.sending
                : t.send}
          </Button>
        </div>
      </form>
    </RadioPanel>
  )
}
