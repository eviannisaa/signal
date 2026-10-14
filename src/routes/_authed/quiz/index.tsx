import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BookOpen, ListChecks, RotateCcw } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { NoSignal, PageHeader, RadioPanel, SignalMeter } from '#/components/radio/primitives'
import { getQuizzes } from '#/features/quiz/server'
import type { QuizListItem } from '#/features/quiz/server'
import { scoreRatio } from '#/features/quiz/grade'
import { formatPercent } from '#/features/quiz/format'
import { quizMessages } from '#/features/quiz/messages'
import { useLocale, useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/quiz/')({
  head: ({ match }) => ({ meta: [{ title: quizMessages[match.context.locale].metaTitle }] }),
  loader: () => getQuizzes(),
  component: QuizListPage,
})

function QuizListPage() {
  const quizzes = Route.useLoaderData()
  const t = useT(quizMessages).list
  return (
    <>
      <PageHeader
        eyebrow="CH-04 · Quiz"
        title={t.title}
        description={t.description}
        actions={
          <Button asChild variant="outline">
            <Link to="/progress">{t.viewProgress}</Link>
          </Button>
        }
      />
      {quizzes.length === 0 ? (
        <NoSignal title={t.emptyTitle} message={t.emptyMessage} action={<Button asChild><Link to="/learn">{t.openLesson}</Link></Button>} />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q, i) => (
            <li key={q.id}>
              <QuizCard quiz={q} index={i} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function QuizCard({ quiz, index }: { quiz: QuizListItem; index: number }) {
  const attempted = quiz.bestScore !== null
  const ratio = attempted ? scoreRatio(quiz.bestScore ?? 0, quiz.questionCount) : 0
  const t = useT(quizMessages).list
  const locale = useLocale()
  return (
    <RadioPanel
      channel={`Q-${String(index + 1).padStart(2, '0')}`}
      title={attempted ? t.recorded : t.ready}
      led={attempted}
      className="flex h-full flex-col transition-colors hover:border-white/20"
      bodyClassName="flex flex-1 flex-col gap-5"
    >
      <div>
        <h2 className="text-xl font-semibold">{quiz.title}</h2>
        {quiz.lesson ? (
          <Link
            to="/learn/$slug"
            params={{ slug: quiz.lesson.slug }}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded text-sm text-signal-cyan hover:underline focus-visible:outline-2 focus-visible:outline-signal-cyan"
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            {t.lesson(quiz.lesson.title)}
          </Link>
        ) : (
          <p className="mt-1.5 text-sm text-signal-offwhite/60">{t.mixed}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/20 p-3.5">
        <div>
          <dt className="radio-label text-signal-offwhite/50">{t.questions}</dt>
          <dd className="mt-1 flex items-center gap-1.5 font-mono text-lg">
            <ListChecks className="size-4 text-signal-cyan" aria-hidden="true" />
            {quiz.questionCount}
          </dd>
        </div>
        <div>
          <dt className="radio-label text-signal-offwhite/50">{t.bestScore}</dt>
          <dd className="mt-1 flex items-center gap-2.5 font-mono text-lg text-signal-offwhite">
            {attempted ? (
              <>
                <SignalMeter value={ratio} label={t.bestScoreOf(quiz.bestScore ?? 0, quiz.questionCount)} className="text-signal-offwhite" />
                <span>
                  {quiz.bestScore}/{quiz.questionCount}
                </span>
              </>
            ) : (
              <span className="text-sm text-signal-offwhite/55">{t.none}</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="radio-label text-signal-offwhite/50">
          {attempted ? t.attempts(quiz.attemptCount, formatPercent(quiz.bestScore ?? 0, quiz.questionCount, locale)) : t.notAttempted}
        </span>
        <Button asChild size="sm">
          <Link to="/quiz/$slug" params={{ slug: quiz.slug }} aria-label={`${attempted ? t.retry : t.start} ${quiz.title}`}>
            {attempted ? <RotateCcw /> : null}
            {attempted ? t.retry : t.start}
            {!attempted && <ArrowRight />}
          </Link>
        </Button>
      </div>
    </RadioPanel>
  )
}
