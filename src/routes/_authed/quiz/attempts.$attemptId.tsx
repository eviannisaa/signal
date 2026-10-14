import { Link, createFileRoute } from '@tanstack/react-router'
import { BarChart3, CircleCheck, CircleX, RotateCcw } from 'lucide-react'

import { cn } from '#/lib/utils'
import { looksLikeMorse, toDisplay } from '#/lib/morse'
import { Button } from '#/components/ui/button'
import { MorseSymbols, NoSignal, PageHeader, RadioPanel, SignalMeter } from '#/components/radio/primitives'
import { getAttempt } from '#/features/quiz/server'
import type { AttemptResult } from '#/features/quiz/server'
import { scoreRatio } from '#/features/quiz/grade'
import { formatDateTime, formatPercent } from '#/features/quiz/format'
import { ScoreBar } from '#/features/quiz/components/ScoreBar'
import { quizMessages } from '#/features/quiz/messages'
import { useLocale, useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/quiz/attempts/$attemptId')({
  loader: ({ params }) => getAttempt({ data: { attemptId: params.attemptId } }),
  head: ({ match }) => ({ meta: [{ title: quizMessages[match.context.locale].resultMetaTitle }] }),
  component: AttemptPage,
  notFoundComponent: AttemptNotFound,
})

function AttemptNotFound() {
  const t = useT(quizMessages).result
  return (
    <NoSignal
      title={t.notFoundTitle}
      message={t.notFoundMessage}
      action={
        <Button asChild>
          <Link to="/quiz">{t.backToList}</Link>
        </Button>
      }
    />
  )
}

type ResultMessages = (typeof quizMessages)['id']['result']

function verdict(ratio: number, t: ResultMessages) {
  if (ratio >= 0.8) return t.strong
  if (ratio >= 0.5) return t.fair
  return t.weak
}

function AttemptPage() {
  const attempt = Route.useLoaderData()
  const t = useT(quizMessages).result
  const locale = useLocale()
  const ratio = scoreRatio(attempt.score, attempt.total)
  const v = verdict(ratio, t)
  const percent = formatPercent(attempt.score, attempt.total, locale)
  const wrong = attempt.total - attempt.score

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={attempt.quiz.title} description={t.sentAt(formatDateTime(attempt.createdAt, locale))} />

      <RadioPanel channel="RX" title="Transmission report" bodyClassName="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
        <div aria-live="polite" className="flex items-end gap-5">
          <div>
            <p className="radio-label text-signal-offwhite/55">Score</p>
            <p className="mt-2 font-mono text-6xl leading-none font-semibold sm:text-7xl">
              {attempt.score}
              <span className="text-3xl text-signal-offwhite/45 sm:text-4xl">/{attempt.total}</span>
            </p>
            <p className="sr-only">
              {t.summary(attempt.score, attempt.total, percent, v.label)}
            </p>
          </div>
          <SignalMeter value={ratio} bars={5} label={t.strength(percent)} className="mb-1 origin-bottom-left scale-[1.6] text-signal-offwhite" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lg font-semibold">{v.label}</p>
            <p className="font-mono text-2xl text-signal-cyan">{percent}</p>
          </div>
          <ScoreBar score={attempt.score} total={attempt.total} />
          <p className="text-sm text-signal-offwhite/70">{v.note}</p>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
              <dt className="radio-label text-signal-offwhite/50">{t.correct}</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-mono text-lg">
                <CircleCheck className="size-4 text-green-400" aria-hidden="true" />
                {attempt.score}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
              <dt className="radio-label text-signal-offwhite/50">{t.wrong}</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-mono text-lg">
                <CircleX className="size-4 text-red-400" aria-hidden="true" />
                {wrong}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/quiz/$slug" params={{ slug: attempt.quiz.slug }}>
                <RotateCcw />
                {t.retry}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 bg-transparent text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite">
              <Link to="/progress">
                <BarChart3 />
                {t.viewProgress}
              </Link>
            </Button>
          </div>
        </div>
      </RadioPanel>

      <section className="mt-10" aria-labelledby="koreksi-heading">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="radio-label text-signal-blue">{t.log}</p>
            <h2 id="koreksi-heading" className="mt-1 text-xl font-semibold">
              {t.corrections}
            </h2>
          </div>
          <Link to="/quiz" className="text-sm font-medium text-signal-blue hover:underline">
            {t.quizList}
          </Link>
        </div>
        <ol className="flex flex-col gap-3">
          {attempt.results.map((r, i) => (
            <li key={r.questionId}>
              <CorrectionRow item={r} number={i + 1} />
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

function CorrectionRow({ item, number }: { item: AttemptResult['results'][number]; number: number }) {
  const ok = item.isCorrect
  const t = useT(quizMessages).result
  return (
    <article
      className={cn('surface-card overflow-hidden border-l-4 p-4 sm:p-5', ok ? 'border-l-green-500' : 'border-l-red-500')}
      aria-label={t.row(number, ok)}
    >
      <header className="mb-4 flex flex-wrap items-center gap-2.5">
        <span className="radio-label text-muted-foreground">#{String(number).padStart(2, '0')}</span>
        <span className="radio-label rounded-md bg-white/[0.06] px-2 py-0.5 text-signal-cyan ring-1 ring-white/10">{item.type === 'encode' ? 'Encode' : 'Decode'}</span>
        <span className={cn('ml-auto inline-flex items-center gap-1.5 text-sm font-semibold', ok ? 'text-green-400' : 'text-red-400')}>
          {ok ? <CircleCheck className="size-4" aria-hidden="true" /> : <CircleX className="size-4" aria-hidden="true" />}
          {ok ? t.correct : t.wrong}
        </span>
      </header>
      <dl className="grid gap-4 sm:grid-cols-3">
        <Cell label={t.question}>
          <Value value={item.prompt} morse={item.type === 'decode'} />
        </Cell>
        <Cell label={t.yourAnswer}>
          {item.answer ? <Value value={item.answer} morse={item.type === 'encode' && looksLikeMorse(item.answer)} /> : <span className="text-sm text-muted-foreground italic">{t.noAnswer}</span>}
        </Cell>
        <Cell label={t.correctAnswer}>
          <Value value={item.correctAnswer} morse={item.type === 'encode'} />
        </Cell>
      </dl>
    </article>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="radio-label mb-1.5 text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Value({ value, morse }: { value: string; morse: boolean }) {
  if (!morse) return <span className="font-mono text-lg font-semibold tracking-widest break-all">{value.toUpperCase()}</span>
  return (
    <span className="inline-flex max-w-full flex-col gap-1.5 rounded-lg bg-black/30 px-3 py-2.5 ring-1 ring-white/[0.08]">
      <MorseSymbols code={value} size="sm" />
      <span className="font-mono text-xs tracking-widest break-all text-signal-offwhite/60" aria-hidden="true">
        {toDisplay(value)}
      </span>
    </span>
  )
}
