import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BookOpen, ChevronRight, ListChecks } from 'lucide-react'

import { cn } from '#/lib/utils'
import { Button } from '#/components/ui/button'
import { NoSignal, PageHeader, RadioPanel, SignalLed, SignalMeter } from '#/components/radio/primitives'
import { getProgress } from '#/features/progress/server'
import type { ProgressSummary } from '#/features/progress/server'
import { scoreRatio } from '#/features/quiz/grade'
import { formatDateTime, formatPercent } from '#/features/quiz/format'
import { CyanBar } from '#/features/quiz/components/ScoreBar'
import { progressMessages } from '#/features/progress/messages'
import { useLocale, useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/progress')({
  head: ({ match }) => ({ meta: [{ title: progressMessages[match.context.locale].metaTitle }] }),
  loader: () => getProgress(),
  component: ProgressPage,
})

function ProgressPage() {
  const data = Route.useLoaderData()
  const isEmpty = data.lessons.completed === 0 && data.recentAttempts.length === 0
  const firstLesson = data.lessons.items.at(0)
  const t = useT(progressMessages)

  return (
    <>
      <PageHeader eyebrow="CH-05 · Progress" title={t.title} description={t.description} />
      {isEmpty ? (
        <NoSignal
          title={t.emptyTitle}
          message={t.emptyMessage}
          action={
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button asChild>
                {firstLesson ? (
                  <Link to="/learn/$slug" params={{ slug: firstLesson.slug }}>
                    <BookOpen />
                    {t.startFirstLesson}
                  </Link>
                ) : (
                  <Link to="/learn">
                    <BookOpen />
                    {t.openLessons}
                  </Link>
                )}
              </Button>
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite">
                <Link to="/quiz">
                  <ListChecks />
                  {t.chooseQuiz}
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ProgressContent data={data} />
      )}
    </>
  )
}

function ProgressContent({ data }: { data: ProgressSummary }) {
  const { lessons, quizzes, recentAttempts } = data
  const lessonRatio = lessons.total > 0 ? lessons.completed / lessons.total : 0
  const attemptedQuizzes = quizzes.filter((q) => q.bestScore !== null)
  const totalAttempts = quizzes.reduce((s, q) => s + q.attemptCount, 0)
  const avgBest = attemptedQuizzes.length ? attemptedQuizzes.reduce((s, q) => s + scoreRatio(q.bestScore ?? 0, q.total), 0) / attemptedQuizzes.length : 0
  const nextLesson = lessons.items.find((l) => !l.completedAt)
  const t = useT(progressMessages)
  const locale = useLocale()

  return (
    <div className="flex flex-col gap-6">
      <RadioPanel channel="MTR" title="Meter panel" bodyClassName="grid gap-4 sm:grid-cols-3">
        <Meter label={t.meters.lessonsDone} value={`${lessons.completed}/${lessons.total}`} caption={t.meters.lessonsCaption(lessons.completed, lessons.total)} ratio={lessonRatio} />
        <Meter
          label={t.meters.quizzesTaken}
          value={`${attemptedQuizzes.length}/${quizzes.length}`}
          caption={t.meters.attemptsCaption(totalAttempts)}
          ratio={quizzes.length ? attemptedQuizzes.length / quizzes.length : 0}
        />
        <Meter label={t.meters.avgBest} value={attemptedQuizzes.length ? `${Math.round(avgBest * 100)}%` : '–'} caption={t.meters.avgCaption} ratio={avgBest} />
      </RadioPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <RadioPanel
          channel="CH-01"
          title="Lesson"
          actions={nextLesson && (
            <Link to="/learn/$slug" params={{ slug: nextLesson.slug }} className="radio-label inline-flex items-center gap-1 rounded text-signal-cyan hover:underline focus-visible:outline-2 focus-visible:outline-signal-cyan">
              {t.lessons.continue} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
          bodyClassName="flex flex-col gap-4"
        >
          <div className="flex items-center gap-4">
            <SignalMeter value={lessonRatio} bars={Math.max(5, Math.min(10, lessons.total))} label={t.lessons.doneOfTotal(lessons.completed, lessons.total)} className="text-signal-offwhite" />
            <p className="text-sm text-signal-offwhite/75">
              <span className="font-mono text-lg text-signal-offwhite">{lessons.completed}</span>{t.lessons.doneSuffix(lessons.total)}
            </p>
          </div>
          <CyanBar value={lessonRatio} label={t.lessons.progress} />
          {lessons.items.length === 0 ? (
            <p className="text-sm text-signal-offwhite/60">{t.lessons.empty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {lessons.items.map((l) => (
                <li key={l.slug}>
                  <Link
                    to="/learn/$slug"
                    params={{ slug: l.slug }}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-signal-cyan"
                  >
                    <SignalLed on={!!l.completedAt} size="sm" />
                    <span className="radio-label w-6 shrink-0 text-signal-offwhite/45">{String(l.position).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{l.title}</span>
                    <span className={cn('radio-label shrink-0', l.completedAt ? 'text-signal-cyan' : 'text-signal-offwhite/40')}>{l.completedAt ? t.lessons.done : t.lessons.notDone}</span>
                    <ChevronRight className="size-4 shrink-0 text-signal-offwhite/30 group-hover:text-signal-offwhite/70" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </RadioPanel>

        <RadioPanel channel="CH-04" title={t.quizzes.title} bodyClassName="flex flex-col gap-1">
          {quizzes.length === 0 ? (
            <p className="text-sm text-signal-offwhite/60">{t.quizzes.empty}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {quizzes.map((q) => {
                const ratio = q.bestScore === null ? 0 : scoreRatio(q.bestScore, q.total)
                return (
                  <li key={q.slug} className="flex flex-col gap-2.5 py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Link to="/quiz/$slug" params={{ slug: q.slug }} className="min-w-0 flex-1 truncate rounded text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-signal-cyan">
                        {q.title}
                      </Link>
                      {q.bestScore === null ? (
                        <span className="radio-label text-signal-offwhite/45">{t.quizzes.notAttempted}</span>
                      ) : (
                        <>
                          <SignalMeter value={ratio} label={t.quizzes.bestScoreOf(q.bestScore, q.total)} className="text-signal-offwhite" />
                          <span className="w-12 text-right font-mono text-sm">
                            {q.bestScore}/{q.total}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <CyanBar value={ratio} label={t.quizzes.bestScoreFor(q.title)} className="h-1.5" />
                      <span className="radio-label w-24 shrink-0 text-right text-signal-offwhite/45">{t.quizzes.attempts(q.attemptCount)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </RadioPanel>
      </div>

      <RadioPanel channel="LOG" title={t.history.title} actions={<span className="radio-label text-signal-offwhite/45">{t.history.last10}</span>} bodyClassName="p-0 sm:p-0">
        {recentAttempts.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-5 sm:p-6">
            <p className="text-sm text-signal-offwhite/70">{t.history.empty}</p>
            <Button asChild size="sm">
              <Link to="/quiz">
                {t.history.chooseQuiz} <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <ol className="divide-y divide-white/5 font-mono text-sm">
            {recentAttempts.map((a) => {
              const ratio = scoreRatio(a.score, a.total)
              return (
                <li key={a.id}>
                  <Link
                    to="/quiz/attempts/$attemptId"
                    params={{ attemptId: a.id }}
                    className="group flex items-center gap-3 px-5 py-3 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal-cyan sm:gap-4 sm:px-6"
                    aria-label={t.history.row(a.quizTitle, a.score, a.total, formatDateTime(a.createdAt, locale))}
                  >
                    <span className="text-signal-cyan" aria-hidden="true">[RX]</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="order-last text-xs text-signal-offwhite/50 sm:order-first sm:w-48 sm:shrink-0">{formatDateTime(a.createdAt, locale)}</span>
                      <span className="truncate font-sans text-signal-offwhite">{a.quizTitle}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <SignalMeter value={ratio} className="hidden text-signal-offwhite sm:inline-flex" />
                      <span className="w-12 text-right">
                        {a.score}/{a.total}
                      </span>
                      <span className="hidden w-10 text-right text-signal-offwhite/50 sm:inline">{formatPercent(a.score, a.total, locale)}</span>
                      <ChevronRight className="size-4 text-signal-offwhite/30 group-hover:text-signal-offwhite/70" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </RadioPanel>
    </div>
  )
}

function Meter({ label, value, caption, ratio }: { label: string; value: string; caption: string; ratio: number }) {
  const t = useT(progressMessages)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="radio-label text-signal-offwhite/55">{label}</p>
        <SignalMeter value={ratio} label={t.meters.percentLabel(label, Math.round(ratio * 100))} className="text-signal-offwhite" />
      </div>
      <p className="font-mono text-3xl font-semibold">{value}</p>
      <CyanBar value={ratio} label={label} />
      <p className="text-xs text-signal-offwhite/55">{caption}</p>
    </div>
  )
}
