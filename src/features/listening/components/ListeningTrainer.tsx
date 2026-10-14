import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Info, Lightbulb, Play, RotateCcw, Square, Volume2 } from 'lucide-react'

import { cn } from '#/lib/utils'
import { DEFAULT_FREQUENCY, encode, isSameAnswer, normalizeText, unsupportedChars } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { useLocale, useT } from '#/lib/i18n'
import { randomPrompt } from '#/lib/prompts'
import type { PromptLevel } from '#/lib/prompts'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { useMorsePlayer, usePrefersReducedMotion } from '#/components/morse/use-morse-player'
import { RadioPanel, SignalLed } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { AnswerVerdict, ControlLabel, Segmented, SessionMeter } from '#/features/practice/components/controls'
import { practiceMessages } from '#/features/practice/messages'
import { EMPTY_STATS, recordAnswer } from '#/features/practice/practice'
import type { SessionStats } from '#/features/practice/practice'
import { useStoredState } from '#/features/practice/use-stored-state'
import { DEFAULT_SETTINGS, MAX_WPM, MIN_WPM, effectiveWpm, parseListeningSettings, speedLabel } from '../listening'
import type { ListeningSettings, QuestionSignal } from '../listening'
import { listeningMessages } from '../messages'

const LEVELS: PromptLevel[] = ['letter', 'short', 'long']

interface Result {
  correct: boolean
  given: string
}

/** Latihan listening: putar sinyal (bunyi atau cahaya), ketik teksnya, lalu lihat koreksi. */
export function ListeningTrainer() {
  const t = useT(listeningMessages)
  const pt = useT(practiceMessages)
  const [settings, setSettings, ready] = useStoredState<ListeningSettings>('signal.listening.settings', parseListeningSettings, DEFAULT_SETTINGS)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [plays, setPlays] = useState(0)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const [correctionView, setCorrectionView] = useState<MorseView>('timeline')
  const player = useMorsePlayer()
  const reduced = usePrefersReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const { wpm, level, signal } = settings
  const speed = effectiveWpm(signal, wpm)
  const code = prompt ? encode(prompt) : ''
  // Light Signal dengan gerak dikurangi: soal ditampilkan sebagai Signal Timeline statis
  const staticLight = signal === 'light' && reduced
  const stopPlayer = player.stop

  const newQuestion = useCallback(
    (l: PromptLevel, previous?: string) => {
      stopPlayer()
      let p = randomPrompt(l)
      for (let i = 0; i < 5 && p === previous; i++) p = randomPrompt(l)
      setPrompt(p)
      setPlays(0)
      setInput('')
      setError(null)
      setResult(null)
    },
    [stopPlayer],
  )

  useEffect(() => {
    if (ready && prompt === null) newQuestion(level)
  }, [ready, prompt, level, newQuestion])

  // Hentikan pemutaran saat tab disembunyikan agar LED dan bunyi tetap sinkron
  useEffect(() => {
    const onVisibility = () => document.hidden && stopPlayer()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stopPlayer])

  useEffect(() => {
    if (result) nextRef.current?.focus()
  }, [result])

  function update(patch: Partial<ListeningSettings>) {
    stopPlayer()
    setSettings({ ...settings, ...patch })
  }

  function togglePlay() {
    if (!code) return
    if (player.playing) return stopPlayer()
    player.play(code, { wpm: speed, sound: signal === 'audio' })
    setPlays((n) => n + 1)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!prompt || result) return
    if (!input.trim()) {
      setError(pt.errors.empty)
      return
    }
    const bad = unsupportedChars(input)
    if (bad.length > 0) {
      setError(pt.errors.unsupported(bad.join(' ')))
      return
    }
    stopPlayer()
    const correct = isSameAnswer(normalizeText(input), prompt)
    setError(null)
    setResult({ correct, given: normalizeText(input) })
    setStats((s) => recordAnswer(s, correct))
    setCorrectionView('timeline')
  }

  function next() {
    newQuestion(level, prompt ?? undefined)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const lampColor = player.symbol === '-' ? '#2563EB' : '#06B6D4'

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <RadioPanel
        channel="CH-03"
        title={signal === 'audio' ? 'RX · Audio Signal' : 'RX · Light Signal'}
        led={player.playing ? 'blink' : true}
        actions={<span className="radio-label text-signal-offwhite/50">{speed} WPM</span>}
        className="min-w-0 lg:order-1"
      >
        <div className="flex flex-col gap-6">
          {/* Penerima sinyal: tidak ada waveform sebelum menjawab */}
          {staticLight && code && !result ? (
            <div className="flex flex-col gap-2">
              <MorseViewer value={code} view="timeline" mode="question" hideTabs className="bg-black/20" />
              <p className="flex items-start gap-2 text-xs text-signal-offwhite/60">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t.reducedMotion}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 rounded-xl border border-white/10 bg-black/25 px-4 py-8 sm:py-10">
              {signal === 'light' ? (
                <div
                  aria-hidden="true"
                  className="size-32 rounded-full border border-white/10 transition-[background,box-shadow] duration-75 sm:size-36"
                  style={{
                    background: player.on ? `radial-gradient(circle at 35% 30%, #fff8, ${lampColor} 55%)` : 'radial-gradient(circle at 35% 30%, #ffffff14, #0b1220 70%)',
                    boxShadow: player.on ? `0 0 56px 8px ${lampColor}99` : 'inset 0 2px 12px #0008',
                  }}
                />
              ) : (
                <div className="flex items-center gap-3" aria-hidden="true">
                  <SignalLed on={player.on} tone={player.symbol === '-' ? 'blue' : 'cyan'} size="lg" />
                  <span className="font-mono text-xs text-signal-offwhite/60">
                    <Volume2 className="mr-1 inline size-3.5" />
                    {DEFAULT_FREQUENCY} Hz
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={togglePlay}
                disabled={!code}
                aria-label={player.playing ? t.stop : plays === 0 ? t.play : t.replay}
                className={cn(
                  'grid size-20 place-items-center rounded-full bg-signal-blue text-signal-offwhite transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal-cyan disabled:opacity-50',
                  player.playing && 'motion-safe:animate-pulse-ring',
                )}
              >
                {player.playing ? <Square className="size-7 fill-current" /> : plays === 0 ? <Play className="ml-1 size-8 fill-current" /> : <RotateCcw className="size-8" />}
              </button>

              <p className="text-center text-sm text-signal-offwhite/70" aria-live="polite">
                {player.playing
                  ? signal === 'audio'
                    ? t.playingAudio
                    : t.playingLight
                  : plays === 0
                    ? t.pressToPlay(signal === 'audio')
                    : t.played(plays)}
              </p>
              {signal === 'light' && wpm > speed && (
                <p className="text-center font-mono text-xs text-signal-offwhite/55">
                  {t.lightCapped(speed)}
                </p>
              )}
            </div>
          )}

          {!result && (
            <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
              <ControlLabel htmlFor="listening-answer">{signal === 'audio' ? t.heardQuestion : t.seenQuestion}</ControlLabel>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="listening-answer"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setError(null)
                  }}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={level === 'letter' ? t.letterPlaceholder : t.wordPlaceholder}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'listening-error' : undefined}
                  className="h-12 border-white/15 bg-black/20 font-mono text-lg tracking-wider text-signal-offwhite uppercase placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:normal-case placeholder:text-signal-offwhite/35"
                />
                <Button type="submit" className="h-12 px-5">
                  {t.check}
                </Button>
              </div>
              {error && (
                <p id="listening-error" role="alert" className="flex items-start gap-2 text-sm text-red-300">
                  <SignalLed tone="red" size="sm" className="mt-1.5" /> {error}
                </p>
              )}
            </form>
          )}

          <div aria-live="polite">{result && prompt && <AnswerVerdict correct={result.correct} given={result.given} expected={prompt} />}</div>
          {result && prompt && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="radio-label mb-2 text-signal-offwhite/55">{t.correction}</p>
                <MorseViewer value={prompt} view={correctionView} onViewChange={setCorrectionView} mode="learn" wpm={speed} className="bg-black/20" />
              </div>
              <Button ref={nextRef} type="button" size="lg" onClick={next} className="h-11 sm:self-end">
                {t.nextQuestion} <ArrowRight />
              </Button>
            </div>
          )}

          {signal === 'audio' && (
            <p className="flex items-start gap-2 border-t border-white/10 pt-4 text-xs leading-relaxed text-signal-offwhite/55">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {t.noSound}
            </p>
          )}
        </div>
      </RadioPanel>

      <aside className="flex flex-col gap-6 lg:order-2">
        <RadioPanel title={t.settings} led={false}>
          <div className="flex flex-col gap-6">
            <SpeedKnob wpm={wpm} onChange={(v) => update({ wpm: v })} />
            <div>
              <ControlLabel>{t.level}</ControlLabel>
              <Segmented
                label={t.level}
                value={level}
                columns={3}
                onChange={(l) => {
                  update({ level: l })
                  newQuestion(l)
                }}
                options={LEVELS.map((l) => ({ value: l, label: pt.levels[l] }))}
              />
            </div>
            <div>
              <ControlLabel>{t.signal}</ControlLabel>
              <Segmented<QuestionSignal>
                label={t.signal}
                value={signal}
                columns={2}
                onChange={(s) => update({ signal: s })}
                options={[
                  { value: 'audio', label: 'Audio', icon: <Volume2 className="size-3.5" aria-hidden="true" /> },
                  { value: 'light', label: 'Light', icon: <Lightbulb className="size-3.5" aria-hidden="true" /> },
                ]}
              />
              <p className="mt-2 text-xs text-signal-offwhite/50">
                {signal === 'audio' ? t.audioDesc : t.lightDesc}
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

/** Pengatur kecepatan bergaya tombol radio: layar digital, slider, dan skala. */
export function SpeedKnob({ wpm, onChange }: { wpm: number; onChange: (wpm: number) => void }) {
  const locale = useLocale()
  const t = listeningMessages[locale].speed
  const ratio = (wpm - MIN_WPM) / (MAX_WPM - MIN_WPM)
  return (
    <div>
      <ControlLabel id="wpm-label" htmlFor="wpm">{t.label}</ControlLabel>
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="relative grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-b from-white/15 to-black/40 shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_6px_14px_-6px_rgb(0_0_0/0.8)] ring-1 ring-white/10"
        >
          <div className="absolute inset-1.5 rounded-full bg-signal-navy ring-1 ring-black/40" style={{ transform: `rotate(${-135 + ratio * 270}deg)` }}>
            <span className="absolute top-1 left-1/2 h-3 w-1 -translate-x-1/2 rounded-full bg-signal-cyan" />
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-right">
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {wpm}
            <span className="ml-1 text-xs text-signal-offwhite/55">WPM</span>
          </p>
          <p className="radio-label text-signal-cyan">{speedLabel(wpm, locale)}</p>
        </div>
      </div>
      <input
        type="range"
        id="wpm"
        aria-labelledby="wpm-label"
        aria-valuetext={`${wpm} WPM, ${speedLabel(wpm, locale)}`}
        min={MIN_WPM}
        max={MAX_WPM}
        step={1}
        value={wpm}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-5 h-2 w-full cursor-pointer accent-signal-cyan focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal-cyan"
      />
      <div className="mt-2 flex justify-between font-mono text-[0.65rem] text-signal-offwhite/45" aria-hidden="true">
        <span>{MIN_WPM} · {t.slow}</span>
        <span>{t.fast} · {MAX_WPM}</span>
      </div>
    </div>
  )
}
