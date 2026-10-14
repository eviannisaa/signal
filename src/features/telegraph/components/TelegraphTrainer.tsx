import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eraser, Info, Play, Radio, RotateCcw, Send, Square, Volume2, XCircle } from 'lucide-react'

import { cn } from '#/lib/utils'
import { decode, encode, isSameAnswer, normalizeMorse, normalizeText, toTimings, unitMs, unsupportedChars } from '#/lib/morse'
import type { KeyVoice } from '#/lib/morse-audio'
import { marksFromTimings } from '#/lib/morse-keyer'
import { useT } from '#/lib/i18n'
import { randomPrompt } from '#/lib/prompts'
import type { PromptLevel } from '#/lib/prompts'
import { useMorsePlayer } from '#/components/morse/use-morse-player'
import { MorseSymbols, RadioPanel, SignalLed } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { AnswerVerdict, ControlLabel, Segmented, SessionMeter } from '#/features/practice/components/controls'
import { practiceMessages } from '#/features/practice/messages'
import { EMPTY_STATS, recordAnswer } from '#/features/practice/practice'
import type { SessionStats } from '#/features/practice/practice'
import { useStoredState } from '#/features/practice/use-stored-state'
import { SpeedKnob } from '#/features/listening/components/ListeningTrainer'
import { DEFAULT_SETTINGS, checkSent, isSendComplete, parseTelegraphSettings } from '../telegraph'
import type { LetterCheck, TelegraphLevel, TelegraphMode, TelegraphSettings } from '../telegraph'
import { telegraphMessages } from '../messages'
import { useTelegraphKey } from '../use-telegraph-key'
import { PaperTape } from './PaperTape'
import { TelegraphKey } from './TelegraphKey'

const PROMPT_LEVELS: PromptLevel[] = ['letter', 'short', 'long']

/** Latihan telegraf: mengirim dengan kunci yang ditekan, atau menerima telegram lewat bunyi. */
export function TelegraphTrainer() {
  const t = useT(telegraphMessages)
  const levels = useT(practiceMessages).levels
  const [settings, setSettings] = useStoredState<TelegraphSettings>('signal.telegraph.settings', parseTelegraphSettings, DEFAULT_SETTINGS)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const update = (patch: Partial<TelegraphSettings>) => setSettings({ ...settings, ...patch })

  const { mode, wpm, voice } = settings
  // Mode bebas hanya ada untuk mengirim
  const level: TelegraphLevel = mode === 'receive' && settings.level === 'free' ? 'letter' : settings.level
  const onResult = useCallback((correct: boolean) => setStats((s) => recordAnswer(s, correct)), [])

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0">
        {mode === 'send' ? (
          <SendPanel key="send" wpm={wpm} voice={voice} level={level} onResult={onResult} />
        ) : (
          <ReceivePanel key="receive" wpm={wpm} voice={voice} level={level as PromptLevel} onResult={onResult} />
        )}
      </div>

      <aside className="flex flex-col gap-6">
        <RadioPanel title={t.settings} led={false}>
          <div className="flex flex-col gap-6">
            <div>
              <ControlLabel>{t.mode}</ControlLabel>
              <Segmented<TelegraphMode>
                label={t.mode}
                value={mode}
                columns={2}
                onChange={(m) => update({ mode: m })}
                options={[
                  {
                    value: 'send',
                    label: t.send,
                    icon: <Send className="size-3.5" aria-hidden="true" />,
                  },
                  {
                    value: 'receive',
                    label: t.receive,
                    icon: <Radio className="size-3.5" aria-hidden="true" />,
                  },
                ]}
              />
            </div>
            <SpeedKnob wpm={wpm} onChange={(v) => update({ wpm: v })} />
            <div>
              <ControlLabel>{t.prompt}</ControlLabel>
              <Segmented<TelegraphLevel>
                label={t.prompt}
                value={level}
                onChange={(l) => update({ level: l })}
                options={[
                  ...PROMPT_LEVELS.map((l) => ({
                    value: l,
                    label: levels[l],
                  })),
                  ...(mode === 'send' ? [{ value: 'free' as const, label: t.free }] : []),
                ]}
              />
            </div>
            <div>
              <ControlLabel>{t.voice}</ControlLabel>
              <Segmented<KeyVoice>
                label={t.voice}
                value={voice}
                columns={2}
                onChange={(v) => update({ voice: v })}
                options={[
                  { value: 'sounder', label: t.sounder },
                  { value: 'tone', label: t.tone },
                ]}
              />
              <p className="mt-2 text-xs leading-relaxed text-signal-offwhite/50">
                {voice === 'sounder'
                  ? t.sounderDesc
                  : t.toneDesc}
              </p>
            </div>
            <p className="text-xs text-signal-offwhite/45">{t.savedLocally}</p>
          </div>
        </RadioPanel>
        <RadioPanel title={t.session} led={stats.streak > 0}>
          <SessionMeter stats={stats} />
        </RadioPanel>
      </aside>
    </div>
  )
}

/* ------------------------------------------------------------------- Kirim */

function SendPanel({ wpm, voice, level, onResult }: { wpm: number; voice: KeyVoice; level: TelegraphLevel; onResult: (correct: boolean) => void }) {
  const t = useT(telegraphMessages)
  const free = level === 'free'
  const [target, setTarget] = useState<string | null>(null)
  const [checks, setChecks] = useState<LetterCheck[] | null>(null)
  const [hint, setHint] = useState(true)
  const example = useMorsePlayer()
  const keyRef = useRef<HTMLDivElement>(null)

  const finish = useCallback(
    (code: string) => {
      if (!target) return
      const result = checkSent(target, code)
      setChecks(result)
      onResult(result.every((c) => c.correct))
    },
    [target, onResult],
  )

  const key = useTelegraphKey({
    wpm,
    voice,
    enabled: checks === null && !example.playing,
    onLetter: (code) => {
      if (target && isSendComplete(target, code)) finish(code)
    },
  })
  const { reset } = key
  const stopExample = example.stop

  const next = useCallback(
    (previous?: string) => {
      stopExample()
      reset()
      setChecks(null)
      if (level === 'free') return setTarget(null)
      let p = randomPrompt(level)
      for (let i = 0; i < 5 && p === previous; i++) p = randomPrompt(level)
      setTarget(p)
    },
    [level, reset, stopExample],
  )

  useEffect(() => {
    next()
  }, [next])

  function retry() {
    stopExample()
    reset()
    setChecks(null)
  }

  function focusKey() {
    keyRef.current?.querySelector<HTMLButtonElement>('[data-telegraph-key]')?.focus()
  }

  const clean = normalizeMorse(key.code)
  const decoded = decode(key.code)
  const done = checks !== null
  const allCorrect = done && checks.every((c) => c.correct)
  const sentCount = clean ? clean.split(' ').filter((s) => s && s !== '/').length : 0

  return (
    <RadioPanel channel="CH-06" title={t.sendTitle} led={key.pressed ? 'blink' : true} actions={<span className="radio-label text-signal-offwhite/50">{wpm} WPM</span>}>
      <div className="flex flex-col gap-6">
        {/* Soal */}
        {target ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="radio-label text-signal-offwhite/50">{t.sendThisWord}</p>
              <button
                type="button"
                onClick={() => setHint((h) => !h)}
                aria-pressed={hint}
                className="radio-label rounded text-signal-offwhite/50 hover:text-signal-offwhite focus-visible:outline-2 focus-visible:outline-signal-cyan"
              >
                {hint ? t.hideCode : t.showCode}
              </button>
            </div>
            <ol className="flex flex-wrap gap-2" aria-label={t.promptLabel(target)}>
              {Array.from(target).map((char, i) => {
                const check = checks?.[i]
                const current = !done && i === sentCount
                return (
                  <li
                    key={i}
                    className={cn(
                      'flex min-w-14 flex-col items-center gap-2 rounded-md border px-3 py-2.5 transition-colors',
                      check
                        ? check.correct
                          ? 'border-green-500/40 bg-green-500/10'
                          : 'border-red-500/40 bg-red-500/10'
                        : current
                          ? 'border-signal-cyan/50 bg-white/[0.04]'
                          : 'border-white/[0.08]',
                      !done && i < sentCount && 'border-white/15 bg-white/[0.03]',
                    )}
                  >
                    <span className="font-mono text-2xl font-medium">{char}</span>
                    {hint && <MorseSymbols code={encode(char)} size="sm" />}
                  </li>
                )
              })}
            </ol>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-signal-offwhite/60">
            {t.freeIntro}
          </p>
        )}

        {/* Hasil ketukan */}
        <div className="flex flex-col gap-3 rounded-md border border-white/[0.06] bg-black/30 p-4">
          <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-2xl font-medium tracking-[0.2em] break-all" aria-live="polite">
              {decoded || <span className="text-base tracking-normal text-signal-offwhite/30">{t.noSignal}</span>}
            </p>
            {clean && <MorseSymbols code={clean} size="sm" />}
          </div>
          <PaperTape marks={key.marks} unit={key.unit} liveSince={key.pressedAt} />
        </div>

        {/* Kunci */}
        <div ref={keyRef} className="mx-auto w-full max-w-md">
          <TelegraphKey
            pressed={key.pressed || example.on}
            onDown={key.down}
            onUp={key.up}
            disabled={done || example.playing}
            label={t.keyLabel}
          />
        </div>
        <p className="-mt-2 text-center text-xs leading-relaxed text-signal-offwhite/55">
          {t.keyHelp}
          <span className="hidden sm:inline">{t.keyHelpSpace}</span>
        </p>

        {/* Hasil per huruf */}
        {done && (
          <div className={cn('rounded-md border px-4 py-3.5', allCorrect ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10')}>
            <p className={cn('flex items-center gap-2 font-semibold', allCorrect ? 'text-green-300' : 'text-red-300')}>
              {allCorrect ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <XCircle className="size-5" aria-hidden="true" />}
              {allCorrect ? t.sentCorrect : t.sentWrong}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {checks.map((c, i) => (
                <li key={i} className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-3 text-sm">
                  <span className="font-mono font-semibold">{c.char}</span>
                  <span className="flex items-center gap-2">
                    <span className="radio-label text-signal-offwhite/45">{t.you}</span>
                    {c.sent ? <MorseSymbols code={c.sent} size="sm" /> : <span className="text-signal-offwhite/40">—</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="radio-label text-signal-offwhite/45">{t.correct}</span>
                    <MorseSymbols code={c.expected} size="sm" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(target || done || key.code) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
            {target && (
              <Button
                type="button"
                variant="ghost"
                className="text-signal-offwhite/80 hover:bg-white/[0.06] hover:text-signal-offwhite"
                onClick={() => (example.playing ? example.stop() : example.play(encode(target), { wpm, voice }))}
              >
                {example.playing ? <Square className="fill-current" /> : <Volume2 />}
                {example.playing ? t.stop : t.listenExample}
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              {(done || key.code) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-signal-offwhite/80 hover:bg-white/[0.06] hover:text-signal-offwhite"
                  onClick={() => {
                    retry()
                    focusKey()
                  }}
                >
                  {free ? <Eraser /> : <RotateCcw />}
                  {free ? t.clear : t.retry}
                </Button>
              )}
              {target && (
                <Button
                  type="button"
                  variant={done ? 'default' : 'ghost'}
                  className={cn(!done && 'text-signal-offwhite/80 hover:bg-white/[0.06] hover:text-signal-offwhite')}
                  onClick={() => {
                    next(target)
                    focusKey()
                  }}
                >
                  {done ? t.nextQuestion : t.skip} <ArrowRight />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </RadioPanel>
  )
}

/* ------------------------------------------------------------------ Terima */

interface ReceiveResult {
  correct: boolean
  given: string
}

function ReceivePanel({ wpm, voice, level, onResult }: { wpm: number; voice: KeyVoice; level: PromptLevel; onResult: (correct: boolean) => void }) {
  const t = useT(telegraphMessages)
  const errors = useT(practiceMessages).errors
  const [prompt, setPrompt] = useState<string | null>(null)
  const [plays, setPlays] = useState(0)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReceiveResult | null>(null)
  const player = useMorsePlayer()
  const inputRef = useRef<HTMLInputElement>(null)
  const stopPlayer = player.stop

  const newPrompt = useCallback(
    (previous?: string) => {
      stopPlayer()
      let p = randomPrompt(level)
      for (let i = 0; i < 5 && p === previous; i++) p = randomPrompt(level)
      setPrompt(p)
      setPlays(0)
      setInput('')
      setError(null)
      setResult(null)
    },
    [level, stopPlayer],
  )

  useEffect(() => {
    newPrompt()
  }, [newPrompt])

  const code = prompt ? encode(prompt) : ''

  function togglePlay() {
    if (!code) return
    if (player.playing) return player.stop()
    player.play(code, { wpm, voice })
    setPlays((n) => n + 1)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!prompt || result) return
    if (!input.trim()) return setError(errors.empty)
    const bad = unsupportedChars(input)
    if (bad.length > 0) return setError(errors.unsupported(bad.join(' ')))
    stopPlayer()
    const given = normalizeText(input)
    const correct = isSameAnswer(given, prompt)
    setError(null)
    setResult({ correct, given })
    onResult(correct)
  }

  return (
    <RadioPanel channel="CH-06" title={t.receiveTitle} led={player.playing ? 'blink' : true} actions={<span className="radio-label text-signal-offwhite/50">{wpm} WPM</span>}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-5 rounded-md border border-white/[0.06] bg-black/30 px-4 py-6">
          <div className="w-full max-w-sm">
            <TelegraphKey pressed={player.on} label={player.playing ? t.sounderReceiving : t.sounderWaiting} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" size="lg" onClick={togglePlay} disabled={!code} className="h-10 px-5">
              {player.playing ? <Square className="fill-current" /> : plays === 0 ? <Play className="fill-current" /> : <RotateCcw />}
              {player.playing ? t.stop : plays === 0 ? t.receiveTelegram : t.replay}
            </Button>
            <span className="flex items-center gap-2 font-mono text-xs text-signal-offwhite/50" aria-live="polite">
              <SignalLed on={player.on} size="sm" />
              {player.playing ? t.receiving : plays === 0 ? t.ready : t.played(plays)}
            </span>
          </div>
        </div>

        {result && prompt ? (
          <div className="flex flex-col gap-4">
            <AnswerVerdict correct={result.correct} given={result.given} expected={prompt} />
            <div className="flex flex-col gap-2">
              <p className="radio-label text-signal-offwhite/50">{t.tape}</p>
              <PaperTape marks={marksFromTimings(toTimings(code), unitMs(wpm))} unit={unitMs(wpm)} label={t.tapeLabel(prompt)} />
              <MorseSymbols code={code} size="sm" />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  newPrompt(prompt)
                  requestAnimationFrame(() => inputRef.current?.focus())
                }}
              >
                {t.nextTelegram} <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-2">
            <label htmlFor="telegram-answer" className="radio-label text-signal-offwhite/55">
              {t.answerLabel}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                ref={inputRef}
                id="telegram-answer"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={level === 'letter' ? t.letterPlaceholder : t.wordPlaceholder}
                aria-invalid={!!error}
                aria-describedby={error ? 'telegram-error' : undefined}
                className="h-11 border-white/15 bg-black/20 font-mono text-lg tracking-wider text-signal-offwhite uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:normal-case placeholder:text-signal-offwhite/35"
              />
              <Button type="submit" size="lg" className="h-11 px-5" disabled={plays === 0}>
                {t.check}
              </Button>
            </div>
            {error && (
              <p id="telegram-error" role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}
            {plays === 0 && <p className="text-xs text-signal-offwhite/45">{t.playFirst}</p>}
          </form>
        )}

        <p className="flex items-start gap-2 border-t border-white/[0.07] pt-4 text-xs leading-relaxed text-signal-offwhite/55">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t.operatorTip}
        </p>
      </div>
    </RadioPanel>
  )
}
