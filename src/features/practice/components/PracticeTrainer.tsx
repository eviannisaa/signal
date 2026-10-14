import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowRight, Delete, Eraser, Shuffle } from 'lucide-react'

import { cn } from '#/lib/utils'
import { MORSE_VIEWS, MORSE_VIEW_LABELS } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { useLocale } from '#/lib/i18n'
import type { PromptLevel } from '#/lib/prompts'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { MorseSymbols, RadioPanel, SignalLed } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Skeleton } from '#/components/ui/skeleton'
import { EMPTY_STATS, checkAnswer, createQuestion, editMorseInput, parseViewChoice, practiceModeSchema, promptLevelSchema, recordAnswer } from '../practice'
import type { PracticeMode, PracticeQuestion, SessionStats, ViewChoice } from '../practice'
import { useStoredState } from '../use-stored-state'
import { practiceMessages } from '../messages'
import { AnswerVerdict, ControlLabel, Segmented, SessionMeter } from './controls'

const parseMode = (raw: unknown): PracticeMode => practiceModeSchema.catch('encode').parse(raw)
const parseLevel = (raw: unknown): PromptLevel => promptLevelSchema.catch('letter').parse(raw)

const LEVELS: PromptLevel[] = ['letter', 'short', 'long']

interface Result {
  correct: boolean
  given: string
  expected: string
}

/** Latihan bebas encode/decode. Seluruhnya berjalan di browser, tanpa Server Function. */
export function PracticeTrainer() {
  const locale = useLocale()
  const t = practiceMessages[locale]
  const [mode, setMode, modeReady] = useStoredState('signal.practice.mode', parseMode, 'encode')
  const [level, setLevel, levelReady] = useStoredState('signal.practice.level', parseLevel, 'letter')
  const [viewChoice, setViewChoice, viewReady] = useStoredState<ViewChoice>('signal.practice.view', parseViewChoice, 'random')
  const ready = modeReady && levelReady && viewReady

  const [question, setQuestion] = useState<PracticeQuestion | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [stats, setStats] = useState<SessionStats>(EMPTY_STATS)
  const [correctionView, setCorrectionView] = useState<MorseView>('text')
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const newQuestion = useCallback(
    (m: PracticeMode, l: PromptLevel, v: ViewChoice, previous?: string) => {
      setQuestion(createQuestion(m, l, v, { previous }))
      setInput('')
      setError(null)
      setResult(null)
    },
    [],
  )

  // Soal pertama dibuat setelah pengaturan dari localStorage terbaca (hindari beda hasil SSR)
  useEffect(() => {
    if (ready && !question) newQuestion(mode, level, viewChoice)
  }, [ready, question, mode, level, viewChoice, newQuestion])

  useEffect(() => {
    if (result) nextRef.current?.focus()
  }, [result])

  function changeMode(m: PracticeMode) {
    setMode(m)
    newQuestion(m, level, viewChoice)
  }
  function changeLevel(l: PromptLevel) {
    setLevel(l)
    newQuestion(mode, l, viewChoice)
  }
  function changeView(v: ViewChoice) {
    setViewChoice(v)
    newQuestion(mode, level, v)
  }
  function next() {
    newQuestion(mode, level, viewChoice, question?.prompt)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!question || result) return
    const r = checkAnswer(question, input, locale)
    if (!r.ok) {
      setError(r.error)
      inputRef.current?.focus()
      return
    }
    setError(null)
    setResult({ correct: r.correct, given: r.given, expected: r.expected })
    setStats((s) => recordAnswer(s, r.correct))
    setCorrectionView('text')
  }

  function press(action: Parameters<typeof editMorseInput>[1]) {
    setInput((v) => editMorseInput(v, action))
    setError(null)
    inputRef.current?.focus()
  }

  function onMorseKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Hanya simbol Morse dan pemisah yang diterima di mode encode
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !/[.\-/ •·–—_]/.test(e.key)) {
      e.preventDefault()
      setError(t.errors.encodeOnly)
    }
  }

  const isEncode = mode === 'encode'
  const channel = isEncode ? 'CH-1' : 'CH-2'

  return (
    <div className="flex flex-col gap-6">
      {/* Pemilih channel encode/decode */}
      <div role="radiogroup" aria-label={t.modeGroup} className="grid gap-3 sm:grid-cols-2">
        <ChannelButton active={isEncode} channel="CH-1" name="Encode" hint={t.encodeHint} onClick={() => changeMode('encode')} />
        <ChannelButton active={!isEncode} channel="CH-2" name="Decode" hint={t.decodeHint} onClick={() => changeMode('decode')} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <RadioPanel
          channel={channel}
          title={isEncode ? t.encodeTitle : t.decodeTitle}
          led={result ? true : 'blink'}
          actions={
            <span className="radio-label hidden text-signal-offwhite/50 sm:inline">
              {t.questionNumber(stats.answered + (result ? 0 : 1))}
            </span>
          }
          className="min-w-0"
        >
          {!question ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 w-full bg-white/10" />
              <Skeleton className="h-11 w-full bg-white/10" />
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
              {question.mode === 'encode' ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-8 text-center">
                  <p className="text-sm text-signal-offwhite/60">{t.encodePrompt}</p>
                  <p className="font-mono text-5xl font-medium tracking-[0.25em] break-all sm:text-6xl" aria-live="polite">
                    {question.prompt}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-signal-offwhite/60">{t.decodePrompt}</p>
                    {question.view && (
                      <span className="radio-label inline-flex items-center gap-1.5 text-signal-offwhite/50">
                        {viewChoice === 'random' && <Shuffle className="size-3" aria-hidden="true" />}
                        {MORSE_VIEW_LABELS[question.view]}
                      </span>
                    )}
                  </div>
                  <MorseViewer key={`${question.prompt}-${question.view}`} value={question.code} view={question.view ?? 'text'} mode="question" hideTabs className="bg-black/20" />
                  {question.view === 'audio' && (
                    <p className="text-xs text-signal-offwhite/50">{t.audioHint}</p>
                  )}
                </div>
              )}

              {!result && (
                <div className="flex flex-col gap-3">
                  <ControlLabel htmlFor="practice-answer">{isEncode ? t.yourCode : t.yourAnswer}</ControlLabel>
                  <div className="-mt-2 flex gap-2">
                    <Input
                      ref={inputRef}
                      id="practice-answer"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={isEncode ? onMorseKeyDown : undefined}
                      autoComplete="off"
                      autoCapitalize={isEncode ? 'off' : 'characters'}
                      spellCheck={false}
                      inputMode={isEncode ? 'none' : 'text'}
                      placeholder={isEncode ? t.encodePlaceholder : t.decodePlaceholder}
                      aria-invalid={!!error}
                      aria-describedby={error ? 'practice-error' : 'practice-help'}
                      className={cn(
                        'h-12 border-white/15 bg-black/20 font-mono text-lg tracking-wider text-signal-offwhite placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-signal-offwhite/35',
                        !isEncode && 'uppercase placeholder:normal-case',
                      )}
                    />
                    <Button type="submit" className="h-12 px-5">
                      {t.check}
                    </Button>
                  </div>

                  {isEncode && (
                    <>
                      <div className="flex min-h-9 items-center rounded-lg border border-dashed border-white/10 px-3 py-2" aria-hidden={!input}>
                        {input.trim() ? <MorseSymbols code={input} size="sm" /> : <span className="text-xs text-signal-offwhite/40">{t.previewEmpty}</span>}
                      </div>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto]">
                        <KeyButton onClick={() => press('.')} label={t.keys.dot} big>
                          <span className="size-3.5 rounded-full bg-morse-dot" aria-hidden="true" />
                          {t.keys.dot}
                        </KeyButton>
                        <KeyButton onClick={() => press('-')} label={t.keys.dash} big>
                          <span className="h-3.5 w-10 rounded-full bg-morse-dash" aria-hidden="true" />
                          {t.keys.dash}
                        </KeyButton>
                        <KeyButton onClick={() => press('letter')} label={t.keys.letterGap}>
                          {t.keys.space}
                        </KeyButton>
                        <KeyButton onClick={() => press('word')} label={t.keys.wordGap}>
                          {t.keys.word}
                        </KeyButton>
                        <KeyButton onClick={() => press('backspace')} label={t.keys.backspace}>
                          <Delete className="size-4" aria-hidden="true" />
                        </KeyButton>
                        <KeyButton onClick={() => press('clear')} label={t.keys.clear}>
                          <Eraser className="size-4" aria-hidden="true" />
                        </KeyButton>
                      </div>
                    </>
                  )}

                  {error ? (
                    <p id="practice-error" role="alert" className="flex items-start gap-2 text-sm text-red-300">
                      <SignalLed tone="red" size="sm" className="mt-1.5" /> {error}
                    </p>
                  ) : (
                    <p id="practice-help" className="text-xs text-signal-offwhite/50">
                      {isEncode
                        ? t.encodeHelp
                        : t.decodeHelp}
                    </p>
                  )}
                </div>
              )}

              <div aria-live="polite">
                {result && (
                  <AnswerVerdict correct={result.correct} given={result.given} expected={result.expected} expectedIsCode={question.mode === 'encode'}>
                    {question.mode === 'encode' && (
                      <p className="mt-2 text-sm text-signal-offwhite/70">
                        {t.textLabel} <span className="font-mono font-semibold">{question.prompt}</span>
                      </p>
                    )}
                  </AnswerVerdict>
                )}
              </div>
              {result && (
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="radio-label mb-2 text-signal-offwhite/55">{t.correction}</p>
                    <MorseViewer value={question.prompt} view={correctionView} onViewChange={setCorrectionView} mode="learn" className="bg-black/20" />
                  </div>
                  <Button ref={nextRef} type="button" size="lg" onClick={next} className="h-11 sm:self-end">
                    {t.nextQuestion} <ArrowRight />
                  </Button>
                </div>
              )}
            </form>
          )}
        </RadioPanel>

        <aside className="flex flex-col gap-6">
          <RadioPanel title={t.settings} led={false}>
            <div className="flex flex-col gap-5">
              <div>
                <ControlLabel id="level-label">{t.level}</ControlLabel>
                <Segmented label={t.level} value={level} onChange={changeLevel} options={LEVELS.map((l) => ({ value: l, label: t.levels[l] }))} columns={3} />
              </div>
              {!isEncode && (
                <div>
                  <ControlLabel id="view-label">{t.view}</ControlLabel>
                  <Segmented
                    label={t.view}
                    value={viewChoice}
                    onChange={changeView}
                    columns={2}
                    options={[
                      ...MORSE_VIEWS.map((v) => ({ value: v, label: MORSE_VIEW_LABELS[v] })),
                      { value: 'random' as const, label: t.random, icon: <Shuffle className="size-3.5" aria-hidden="true" /> },
                    ]}
                  />
                  <p className="mt-2 text-xs text-signal-offwhite/50">{t.savedLocally}</p>
                </div>
              )}
            </div>
          </RadioPanel>
          <RadioPanel title={t.session} led={stats.streak > 0}>
            <SessionMeter stats={stats} />
            <p className="mt-4 text-xs text-signal-offwhite/50">{t.notSaved}</p>
          </RadioPanel>
        </aside>
      </div>
    </div>
  )
}

function ChannelButton({ active, channel, name, hint, onClick }: { active: boolean; channel: string; name: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        'radio-panel flex items-center gap-4 px-5 py-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-blue',
        active ? 'ring-2 ring-signal-cyan/70' : 'opacity-75 hover:opacity-100',
      )}
    >
      <SignalLed on={active} size="lg" />
      <span className="flex flex-col">
        <span className="radio-label text-sm">
          <span className="text-signal-cyan">{channel}</span> <span className="text-signal-offwhite">{name}</span>
        </span>
        <span className="mt-0.5 text-sm text-signal-offwhite/60">{hint}</span>
      </span>
    </button>
  )
}

function KeyButton({ onClick, label, big, children }: { onClick: () => void; label: string; big?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 font-mono text-xs font-medium text-signal-offwhite/85 transition-colors hover:bg-white/10 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-cyan',
        big && 'col-span-2 h-14 text-sm sm:col-span-1 sm:px-6',
      )}
    >
      {children}
    </button>
  )
}
