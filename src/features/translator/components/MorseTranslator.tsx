import { memo, useEffect, useId, useMemo, useState } from 'react'
import { ArrowRightLeft, Check, Copy, Play, Square, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '#/lib/utils'
import { DEFAULT_WPM, toDisplay, toSpoken } from '#/lib/morse'
import { useLocale, useT } from '#/lib/i18n'
import type { MorseView } from '#/lib/morse'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { useMorsePlayer } from '#/components/morse/use-morse-player'
import { MorseSymbols, RadioPanel, SignalLed, Waveform } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Slider } from '#/components/ui/slider'
import { MAX_INPUT_LENGTH, copyValue, swapInput, translate } from '../translate'
import type { TranslateDirection, TranslateResult } from '../translate'
import { useDebouncedValue } from '../use-debounced-value'
import { translatorMessages } from '../messages'

type TranslatorMessages = (typeof translatorMessages)['id']

const DIRECTIONS: { value: TranslateDirection; channel: string; from: 'text' | 'morse'; to: 'text' | 'morse' }[] = [
  { value: 'text-to-morse', channel: 'CH-A', from: 'text', to: 'morse' },
  { value: 'morse-to-text', channel: 'CH-B', from: 'morse', to: 'text' },
]

const EXAMPLES: Record<TranslateDirection, string[]> = {
  'text-to-morse': ['SOS', 'Halo dunia', 'Signal 73'],
  'morse-to-text': ['... --- ...', '.... .- .-.. --- / -.. ..- -. .. .-', '•– | –•••'],
}

// Bagian output hanya di-render ulang saat hasil (debounced) berubah, bukan setiap ketukan.
const MemoMorseViewer = memo(MorseViewer)
const MemoWaveform = memo(Waveform)

const MIN_WPM = 5
const MAX_WPM = 20

export function MorseTranslator() {
  const t = useT(translatorMessages)
  const [direction, setDirection] = useState<TranslateDirection>('text-to-morse')
  const [input, setInput] = useState('')
  const [view, setView] = useState<MorseView>('audio')
  const [wpm, setWpm] = useState(DEFAULT_WPM)
  const [copied, setCopied] = useState(false)
  const inputId = useId()
  const hintId = useId()

  const debounced = useDebouncedValue(input, 150)
  const result = useMemo(() => translate(debounced, direction), [debounced, direction])
  const { code } = result
  const player = useMorsePlayer()

  // Hasil berubah: hentikan pemutaran lama agar LED dan playhead tidak tertinggal.
  useEffect(() => player.stop, [code, wpm, player.stop])

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(id)
  }, [copied])

  const isText = direction === 'text-to-morse'
  const hasOutput = code.length > 0

  function changeDirection(next: TranslateDirection) {
    if (next === direction) return
    setDirection(next)
    setInput('')
  }

  function swap() {
    const current = translate(input, direction)
    setDirection(isText ? 'morse-to-text' : 'text-to-morse')
    setInput(swapInput(current))
  }

  async function copy() {
    const value = copyValue(result)
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(t.copied)
    } catch {
      toast.error(t.copyFailed)
    }
  }

  function togglePlay() {
    if (player.playing) player.stop()
    else if (hasOutput) player.play(code, { wpm })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Pemilih arah sebagai channel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={t.directionGroup} className="radio-panel flex w-full gap-1 rounded-lg p-1 sm:w-auto">
          {DIRECTIONS.map((d) => {
            const active = d.value === direction
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={active}
                onClick={() => changeDirection(d.value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan sm:flex-none sm:px-4',
                  active ? 'bg-white/10 text-signal-offwhite ring-1 ring-white/10' : 'text-signal-offwhite/55 hover:text-signal-offwhite',
                )}
              >
                <span className={cn('hidden text-[10px] min-[400px]:inline', active ? 'text-signal-cyan' : 'text-signal-offwhite/35')}>{d.channel}</span>
                {t[d.from]} <span aria-hidden="true">→</span>
                <span className="sr-only">{t.to}</span> {t[d.to]}
              </button>
            )
          })}
        </div>
        <Button type="button" variant="outline" onClick={swap} className="h-10 self-start rounded-xl sm:self-auto">
          <ArrowRightLeft /> {t.swap}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <RadioPanel
          channel="RX"
          title={t.inputTitle(isText ? t.text : t.morse)}
          led={input.length > 0}
          className="flex flex-col"
          bodyClassName="flex flex-1 flex-col gap-4"
          actions={
            <span className={cn('font-mono text-xs tabular-nums', input.length >= MAX_INPUT_LENGTH ? 'text-amber-300' : 'text-signal-offwhite/55')} aria-live="polite">
              {input.length}/{MAX_INPUT_LENGTH}
            </span>
          }
        >
          <label htmlFor={inputId} className="sr-only">
            {isText ? t.inputLabelText : t.inputLabelMorse}
          </label>
          <textarea
            id={inputId}
            value={input}
            maxLength={MAX_INPUT_LENGTH}
            onChange={(e) => setInput(e.target.value)}
            aria-describedby={hintId}
            spellCheck={false}
            autoComplete="off"
            rows={6}
            placeholder={isText ? t.placeholderText : t.placeholderMorse}
            className={cn(
              'min-h-40 w-full flex-1 resize-y rounded-xl border border-white/15 bg-black/20 p-4 text-base leading-relaxed text-signal-offwhite placeholder:text-signal-offwhite/35 focus-visible:border-signal-cyan/60 focus-visible:ring-2 focus-visible:ring-signal-cyan/40 focus-visible:outline-none',
              !isText && 'font-mono tracking-wider',
            )}
          />
          <p id={hintId} className="text-xs leading-relaxed text-signal-offwhite/55">
            {isText ? t.hintText : t.hintMorse}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="radio-label text-signal-offwhite/45">{t.examples}</span>
            {EXAMPLES[direction].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInput(ex)}
                className="max-w-full truncate rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-signal-offwhite/80 transition hover:border-signal-cyan/50 hover:text-signal-offwhite focus-visible:outline-2 focus-visible:outline-signal-cyan"
              >
                {ex}
              </button>
            ))}
          </div>
        </RadioPanel>

        {/* Output */}
        <RadioPanel
          channel="TX"
          title={t.outputTitle(isText ? t.morse : t.text)}
          led={false}
          className="flex flex-col"
          bodyClassName="flex flex-1 flex-col gap-5"
          actions={
            <span className="flex items-center gap-2 font-mono text-[11px] text-signal-offwhite/60">
              <SignalLed on={player.on} tone={player.symbol === '-' ? 'blue' : 'cyan'} />
              {player.playing ? 'ON AIR' : 'STANDBY'}
            </span>
          }
        >
          <TranslationOutput result={result} />
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <MemoWaveform code={code} progress={player.progress} className="text-signal-offwhite" />
          </div>

          <div className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={togglePlay} disabled={!hasOutput} className="h-10 rounded-xl px-4">
                {player.playing ? <Square className="fill-current" /> : <Play className="fill-current" />}
                {player.playing ? t.stop : t.play}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={copy}
                disabled={!copyValue(result)}
                className="h-10 rounded-xl border border-white/15 px-4 text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? t.copiedButton : t.copy}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <span id={`${inputId}-wpm`} className="radio-label shrink-0 text-signal-offwhite/55">
                {t.speed}
              </span>
              <Slider
                aria-labelledby={`${inputId}-wpm`}
                min={MIN_WPM}
                max={MAX_WPM}
                step={1}
                value={[wpm]}
                onValueChange={([v]) => setWpm(v ?? DEFAULT_WPM)}
                className="max-w-56 [&_[data-slot=slider-track]]:bg-white/15"
              />
              <span className="w-16 shrink-0 text-right font-mono text-xs text-signal-offwhite/80 tabular-nums">{wpm} WPM</span>
            </div>
          </div>
        </RadioPanel>
      </div>

      <p className="sr-only" aria-live="polite">
        {summary(result, t)}
      </p>

      {/* Lima representasi */}
      <section aria-labelledby={`${inputId}-views`} className="flex flex-col gap-4">
        <div>
          <h2 id={`${inputId}-views`} className="text-xl font-semibold">
            {t.viewsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.viewsDescription}</p>
        </div>
        {hasOutput ? (
          <MemoMorseViewer value={code} view={view} onViewChange={setView} mode="learn" wpm={wpm} />
        ) : (
          <div className="surface-card px-6 py-10 text-center text-sm text-muted-foreground">{t.viewsEmpty}</div>
        )}
      </section>
    </div>
  )
}

function summary(r: TranslateResult, t: TranslatorMessages): string {
  if (!r.code && r.unsupported.length === 0) return ''
  const parts: string[] = []
  if (r.direction === 'morse-to-text' && r.text) parts.push(t.summaryText(r.text))
  else if (r.code) parts.push(t.summaryLetters(r.code.split(' ').filter((s) => s !== '/').length))
  if (r.invalidCount > 0) parts.push(t.summaryInvalid(r.invalidCount))
  if (r.unsupported.length > 0) parts.push(t.summaryUnsupported(r.unsupported.length))
  return parts.join(', ')
}

/* ------------------------------------------------------------------ Output */

const TranslationOutput = memo(function TranslationOutput({ result }: { result: TranslateResult }) {
  const t = useT(translatorMessages)
  const { code, unsupported, invalidCount } = result
  const empty = !code && unsupported.length === 0

  if (empty) {
    return (
      <div className="grid min-h-40 flex-1 place-items-center rounded-xl border border-dashed border-white/15 px-4 text-center">
        <p className="text-sm text-signal-offwhite/55">{t.outputEmpty}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-40 flex-1 flex-col gap-4">
      {result.direction === 'text-to-morse' ? <TextToMorseOutput result={result} /> : <MorseToTextOutput result={result} />}

      {(unsupported.length > 0 || invalidCount > 0) && (
        <div role="note" className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            {unsupported.length > 0 && (
              <p>
                {result.direction === 'text-to-morse' ? t.unsupportedText : t.unsupportedMorse}:{' '}
                <span className="font-mono font-semibold">{unsupported.map((c) => (c === ' ' ? '␣' : c)).join('  ')}</span>
                <span className="text-amber-100/70">{t.notTranslated}</span>
              </p>
            )}
            {invalidCount > 0 && <p>{t.invalidCodes(invalidCount)}</p>}
          </div>
        </div>
      )}
    </div>
  )
})

function TextToMorseOutput({ result }: { result: TranslateResult }) {
  const t = useT(translatorMessages)
  const locale = useLocale()
  const { code, tokens } = result
  return (
    <>
      {code && (
        <p className="font-mono text-2xl leading-relaxed font-medium tracking-[0.18em] break-words" aria-label={t.morseCodeLabel(toSpoken(code, locale))}>
          {Array.from(toDisplay(code)).map((s, i) => (
            <span key={i} className={s === '·' ? 'text-morse-dot' : s === '—' ? 'text-morse-dash' : 'text-signal-offwhite/35'}>
              {s}
            </span>
          ))}
        </p>
      )}
      <ul className="flex flex-wrap gap-2" aria-label={t.perCharacter}>
        {tokens.map((tok, i) =>
          tok.char === ' ' ? (
            <li key={i} className="w-3" aria-hidden="true" />
          ) : tok.code === null ? (
            <li
              key={i}
              className="flex min-w-11 flex-col items-center gap-1.5 rounded-lg border border-dashed border-amber-400/60 bg-amber-400/10 px-2 py-1.5"
              title={t.charUnsupported}
            >
              <span className="font-mono text-sm font-semibold text-amber-200">{tok.char}</span>
              <span className="flex items-center gap-1 text-[10px] text-amber-200/80">
                <TriangleAlert className="size-3" aria-hidden="true" />
                <span className="sr-only">{t.unsupportedShort}</span>
                <span aria-hidden="true">n/a</span>
              </span>
            </li>
          ) : (
            <li key={i} className="flex min-w-11 flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5">
              <span className="font-mono text-sm font-semibold text-signal-offwhite/85">{tok.char}</span>
              <MorseSymbols code={tok.code} size="sm" />
            </li>
          ),
        )}
      </ul>
    </>
  )
}

function MorseToTextOutput({ result }: { result: TranslateResult }) {
  const t = useT(translatorMessages)
  const { words } = result
  return (
    <>
      <p className="text-2xl leading-snug font-semibold tracking-wide break-words" aria-label={t.textLabel(result.text)}>
        {words.map((word, wi) => (
          <span key={wi}>
            {wi > 0 && ' '}
            {word.map((l, li) =>
              l.char === null ? (
                <span key={li} className="mx-px rounded bg-amber-400/20 px-1 text-amber-200 ring-1 ring-amber-400/50" title={t.unknownCode(l.code)}>
                  ?
                </span>
              ) : (
                <span key={li}>{l.char}</span>
              ),
            )}
          </span>
        ))}
      </p>
      <MorseSymbols code={result.code} size="md" />
      <ul className="flex flex-wrap gap-2" aria-label={t.perCode}>
        {words.map((word, wi) => (
          <li key={wi} className="flex flex-wrap gap-2">
            {word.map((l, li) => (
              <span
                key={li}
                className={cn(
                  'flex min-w-11 flex-col items-center gap-1 rounded-lg border px-2 py-1.5',
                  l.char === null ? 'border-dashed border-amber-400/60 bg-amber-400/10' : 'border-white/10 bg-white/[0.04]',
                )}
              >
                <span className={cn('font-mono text-sm font-semibold', l.char === null ? 'text-amber-200' : 'text-signal-offwhite/85')}>{l.char ?? '?'}</span>
                <span className="font-mono text-xs tracking-widest">
                  {Array.from(toDisplay(l.code)).map((s, si) => (
                    <span key={si} className={s === '·' ? 'text-morse-dot' : 'text-morse-dash'}>
                      {s}
                    </span>
                  ))}
                </span>
              </span>
            ))}
            {wi < words.length - 1 && <span className="w-2" aria-hidden="true" />}
          </li>
        ))}
      </ul>
    </>
  )
}
