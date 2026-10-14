import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ChevronDown, CircleDashed, Clock, Radio, XCircle } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/lib/i18n'
import { MORSE_VIEW_LABELS, normalizeMorse, toSpoken } from '#/lib/morse'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { MorseSymbols, RadioPanel, SignalMeter } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'

import type { SubmittedChallenge } from '../server'
import { challengeMessages } from '../messages'
import { formatDuration } from './format'
import { useLeaderboard } from './Leaderboard'

type ResultRow = SubmittedChallenge['results'][number]

/** Laporan transmisi: score, durasi, posisi di leaderboard, dan koreksi per soal. */
export function ChallengeResult({ gameId, result }: { gameId: string; result: SubmittedChallenge }) {
  const t = useT(challengeMessages).result
  const locale = useLocale()
  const { data: board } = useLeaderboard(gameId)
  const rank = board?.find((r) => r.isMe)?.rank
  const hasAnswers = result.results.some((r) => r.given !== null)
  const ratio = result.total ? result.score / result.total : 0

  return (
    <div className="flex flex-col gap-6">
      <RadioPanel channel="RPT" title={t.panelTitle} led>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center" aria-live="polite">
          <div className="flex items-center gap-5">
            <div>
              <p className="radio-label text-signal-offwhite/55">{t.score}</p>
              <p className="font-mono text-5xl font-medium tabular-nums sm:text-6xl">
                {result.score}
                <span className="text-2xl text-signal-offwhite/45 sm:text-3xl">/{result.total}</span>
              </p>
            </div>
            <SignalMeter value={ratio} bars={6} className="h-10 text-signal-offwhite" label={t.scoreLabel(result.score, result.total)} />
          </div>
          <dl className="grid flex-1 grid-cols-2 gap-3 sm:max-w-sm sm:justify-self-end">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <dt className="radio-label flex items-center gap-1.5 text-signal-offwhite/55">
                <Clock className="size-3" aria-hidden="true" /> {t.duration}
              </dt>
              <dd className="mt-1 font-mono text-lg font-semibold">{formatDuration(result.durationMs, locale)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <dt className="radio-label flex items-center gap-1.5 text-signal-offwhite/55">
                <Radio className="size-3" aria-hidden="true" /> {t.rank}
              </dt>
              <dd className="mt-1 font-mono text-lg font-semibold">{rank ? `#${rank}` : '–'}</dd>
            </div>
          </dl>
        </div>
        {result.late && (
          <p className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
            {t.late}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
          <Button asChild variant="secondary" className="rounded-xl">
            <Link to="/" hash="game">
              {t.newGame}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-xl text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite">
            <Link to="/learn">{t.learn}</Link>
          </Button>
        </div>
      </RadioPanel>

      {hasAnswers && (
        <section aria-labelledby="corrections-title" className="flex flex-col gap-3">
          <div>
            <h2 id="corrections-title" className="text-xl font-semibold">
              {t.correctionsTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.correctionsText}</p>
          </div>
          <ol className="flex flex-col gap-2">
            {result.results.map((r, i) => (
              <CorrectionRow key={r.position} row={r} number={i + 1} />
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function CorrectionRow({ row, number }: { row: ResultRow; number: number }) {
  const t = useT(challengeMessages).result
  const [open, setOpen] = useState(false)
  const text = row.type === 'decode' ? row.expected : row.prompt
  const code = row.type === 'decode' ? row.prompt : row.expected
  const graded = row.given !== null
  // Soal yang tidak diisi dibedakan dari jawaban yang keliru, walau keduanya tetap bernilai 0
  const skipped = graded && !row.given?.trim()
  const panelId = `correction-${row.position}`

  return (
    <li className="surface-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-blue sm:gap-4 sm:px-5"
      >
        <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground tabular-nums">{String(number).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="radio-label text-signal-blue">{row.type === 'decode' ? 'Decode' : 'Encode'}</span>
            {row.view && <span>{MORSE_VIEW_LABELS[row.view]}</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono font-semibold">
            <span>{text}</span>
            <span className="inline-flex items-center rounded-md bg-signal-navy px-2.5 py-1.5 leading-none">
              <MorseSymbols code={code} size="xs" />
            </span>
          </p>
          {graded && !skipped && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {t.yourAnswer} <span className="font-mono text-foreground">{row.given}</span>
            </p>
          )}
        </div>
        {graded &&
          (skipped ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground">
              <CircleDashed className="size-4" aria-hidden="true" /> {t.skipped}
            </span>
          ) : row.correct ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-green-400">
              <CheckCircle2 className="size-4" aria-hidden="true" /> {t.correct}
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-red-400">
              <XCircle className="size-4" aria-hidden="true" /> {t.wrong}
            </span>
          ))}
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        <span className="sr-only">{open ? t.hideAnswer : t.showAnswer}</span>
      </button>
      {open && (
        <div id={panelId} className="border-t border-border p-3 sm:p-4">
          {/* Encode tidak punya view; jawabannya kode Morse sehingga ditampilkan sebagai teks titik dan strip */}
          {row.view ? <MorseViewer value={text} view={row.view} mode="learn" hideTabs /> : <CodeText code={code} />}
        </div>
      )}
    </li>
  )
}

/** Kode Morse sebagai teks . dan -, dipisah spasi antarhuruf dan / antarkata. */
function CodeText({ code }: { code: string }) {
  const locale = useLocale()
  return (
    <div className="radio-panel p-5 sm:p-6">
      <p className="font-mono text-2xl leading-relaxed font-semibold tracking-[0.2em] [word-spacing:0.4em] break-words text-signal-offwhite" aria-label={toSpoken(code, locale)}>
        {normalizeMorse(code)}
      </p>
    </div>
  )
}
