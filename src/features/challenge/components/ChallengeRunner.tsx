import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { ChevronLeft, ChevronRight, Loader2, Send, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '#/lib/utils'
import { MORSE_VIEW_LABELS } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { useT } from '#/lib/i18n'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { RadioPanel, SignalLed } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'

import { submitChallenge } from '../server'
import type { PublicRound, RunningChallenge, SubmittedChallenge } from '../server'
import { challengeMessages } from '../messages'
import { formatClock } from './format'
import { MorseKeyInput } from './MorseKeyInput'

function storageKey(gameId: string) {
  return `signal:challenge:${gameId}:answers`
}

function loadAnswers(gameId: string): Record<number, string> {
  try {
    const raw = sessionStorage.getItem(storageKey(gameId))
    return raw ? (JSON.parse(raw) as Record<number, string>) : {}
  } catch {
    return {}
  }
}

/** Layar tantangan: timer digital, soal di panel radio, dan kirim otomatis saat waktu habis. */
export function ChallengeRunner({ gameId, state, onSubmitted }: { gameId: string; state: RunningChallenge; onSubmitted: (result: SubmittedChallenge) => void }) {
  const t = useT(challengeMessages).runner
  const submit = useServerFn(submitChallenge)
  const rounds = state.rounds
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const submittedRef = useRef(false)
  const answersRef = useRef(answers)
  answersRef.current = answers

  // Timer dihitung dari started_at server; selisih jam browser dikoreksi dengan serverNow
  const deadline = useMemo(() => {
    const offset = Date.parse(state.serverNow) - Date.now()
    return Date.parse(state.startedAt) + state.timeLimitSec * 1000 - offset
  }, [state])
  const [remaining, setRemaining] = useState(() => deadline - Date.now())

  useEffect(() => setAnswers(loadAnswers(gameId)), [gameId])
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(gameId), JSON.stringify(answers))
    } catch {
      // Penyimpanan sementara tidak tersedia; jawaban tetap ada di memori
    }
  }, [gameId, answers])

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return
      submittedRef.current = true
      setSubmitting(true)
      try {
        const payload = Object.entries(answersRef.current).map(([position, answer]) => ({ position: Number(position), answer }))
        const result = await submit({ data: { gameId, answers: payload } })
        try {
          sessionStorage.removeItem(storageKey(gameId))
        } catch {
          // sessionStorage tidak tersedia; jawaban sudah terkirim, jadi kegagalan ini diabaikan
        }
        if (auto) toast.info(t.timeUp)
        onSubmitted(result)
      } catch (err) {
        submittedRef.current = false
        setSubmitting(false)
        toast.error(err instanceof Error ? err.message : t.submitFailed)
      }
    },
    [gameId, onSubmitted, submit, t],
  )

  useEffect(() => {
    const tick = () => {
      const left = deadline - Date.now()
      setRemaining(left)
      if (left <= 0) void doSubmit(true)
    }
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [deadline, doSubmit])

  const round = rounds[index]
  const answered = rounds.filter((r) => (answers[r.position] ?? '').trim()).length
  const unanswered = rounds.length - answered
  const [confirmOpen, setConfirmOpen] = useState(false)
  // Masih ada soal kosong: minta konfirmasi agar jawaban tidak terkirim karena salah tekan
  const requestSubmit = () => (unanswered > 0 ? setConfirmOpen(true) : void doSubmit(false))
  const setAnswer = (value: string) => setAnswers((a) => ({ ...a, [round.position]: value }))
  const next = () => setIndex((i) => Math.min(rounds.length - 1, i + 1))
  const fraction = Math.max(0, Math.min(1, remaining / (state.timeLimitSec * 1000)))
  const urgent = remaining <= 10_000

  return (
    <div className="flex flex-col gap-5">
      {/* Timer digital */}
      <div className="radio-panel flex flex-wrap items-center gap-x-6 gap-y-4 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-4">
          <SignalLed on tone={urgent ? 'red' : 'cyan'} blink={urgent} size="md" />
          <div>
            <p className="radio-label text-signal-offwhite/55">{t.timeLeft}</p>
            <p
              className={cn('font-mono text-4xl font-medium tabular-nums tracking-wider sm:text-5xl', urgent ? 'text-red-300' : 'text-signal-offwhite')}
              role="timer"
              aria-label={t.timeLeftLabel(Math.max(0, Math.ceil(remaining / 1000)))}
            >
              {formatClock(remaining)}
            </p>
          </div>
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <div className="flex justify-between font-mono text-xs text-signal-offwhite/60">
            <span>{t.answered(answered, rounds.length)}</span>
            {urgent && <span className="text-red-300">{t.almostUp}</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div
              className={cn('h-full rounded-full transition-[width] duration-300 ease-linear', urgent ? 'bg-red-400' : 'bg-signal-cyan')}
              style={{ width: `${fraction * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigasi soal */}
      <nav aria-label={t.questionList} className="flex flex-wrap gap-2">
        {rounds.map((r, i) => {
          const done = !!(answers[r.position] ?? '').trim()
          return (
            <button
              key={r.position}
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? 'step' : undefined}
              aria-label={t.questionLabel(i + 1, done)}
              className={cn(
                'grid size-9 place-items-center rounded-lg border font-mono text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-blue',
                i === index
                  ? 'border-signal-blue bg-signal-blue text-white'
                  : done
                    ? 'border-signal-navy bg-signal-navy text-signal-offwhite'
                    : 'border-border bg-card text-muted-foreground hover:border-signal-blue/50',
              )}
            >
              {i + 1}
            </button>
          )
        })}
      </nav>

      <QuestionPanel
        key={round.position}
        round={round}
        number={index + 1}
        total={rounds.length}
        value={answers[round.position] ?? ''}
        onChange={setAnswer}
        onEnter={next}
        disabled={submitting}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft /> {t.previous}
        </Button>
        <Button type="button" variant="outline" size="lg" className="rounded-xl" onClick={next} disabled={index === rounds.length - 1}>
          {t.next} <ChevronRight />
        </Button>
        <Button type="button" size="lg" className="ml-auto rounded-xl px-6" onClick={requestSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Send />}
          {submitting ? t.submitting : t.submit}
        </Button>
      </div>

      {/* Warna dialog ditulis langsung agar tampil sebagai panel kaca yang lebih pekat. Timer tetap berjalan saat dialog terbuka */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent
          showCloseButton={!submitting}
          className="border-white/12 bg-[#0b1120]/90 text-signal-offwhite shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl"
        >
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription className="text-signal-offwhite/65">
              {t.confirmText(answered, rounds.length)}
            </DialogDescription>
          </DialogHeader>
          <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t.confirmWarning(unanswered)}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
              className="border-white/15 bg-white/[0.04] text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite"
            >
              {t.reviewAgain}
            </Button>
            <Button onClick={() => void doSubmit(false)} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              {t.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuestionPanel({
  round,
  number,
  total,
  value,
  onChange,
  onEnter,
  disabled,
}: {
  round: PublicRound
  number: number
  total: number
  value: string
  onChange: (v: string) => void
  onEnter: () => void
  disabled: boolean
}) {
  const t = useT(challengeMessages).runner
  const inputId = useId()
  const hintId = useId()
  const answered = !!value.trim()
  // Tidak semua view punya petunjuk; view tanpa petunjuk dibiarkan kosong
  const decodeHint: Partial<Record<MorseView, string>> = t.decodeHint
  const title = round.type === 'decode' && round.view ? t.decodeTitle(MORSE_VIEW_LABELS[round.view]) : t.encodeTitle

  return (
    <RadioPanel
      channel={`Q${String(number).padStart(2, '0')}/${total}`}
      title={title}
      led={false}
      actions={
        <span className="flex items-center gap-2 font-mono text-[0.68rem] text-signal-offwhite/55 uppercase">
          {answered ? t.statusAnswered : t.statusWaiting}
          <SignalLed on={answered} tone="green" size="sm" />
        </span>
      }
    >
      {round.type === 'decode' && round.view ? (
        <div className="flex flex-col gap-5">
          <p id={hintId} className="text-sm text-signal-offwhite/70">
            {decodeHint[round.view]}
          </p>
          <MorseViewer value={round.prompt} view={round.view} mode="question" hideTabs className="border-white/10 bg-black/20 shadow-none" />
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="radio-label text-signal-offwhite/70">
              {t.textAnswer}
            </label>
            <Input
              id={inputId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onEnter()
                }
              }}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={60}
              placeholder={t.textPlaceholder}
              aria-describedby={hintId}
              className="h-12 rounded-xl border-white/15 bg-black/25 font-mono text-lg tracking-widest text-signal-offwhite uppercase placeholder:text-sm placeholder:tracking-normal placeholder:normal-case placeholder:text-signal-offwhite/35"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p id={hintId} className="text-sm text-signal-offwhite/70">
            {t.encodeHint}
          </p>
          <div className="grid place-items-center rounded-xl border border-white/10 bg-black/20 px-4 py-8">
            <span className="font-mono text-4xl font-medium tracking-[0.3em] text-signal-offwhite sm:text-5xl">{round.prompt}</span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="radio-label text-signal-offwhite/70">
              {t.morseAnswer}
            </label>
            <MorseKeyInput id={inputId} value={value} onChange={onChange} onEnter={onEnter} disabled={disabled} describedBy={hintId} />
          </div>
        </div>
      )}
    </RadioPanel>
  )
}
