import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Send, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '#/lib/utils'
import { toDisplay } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { MorseSymbols, NoSignal, PageHeader, RadioPanel } from '#/components/radio/primitives'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { getQuizForAttempt, submitQuiz } from '#/features/quiz/server'
import type { QuizForAttempt } from '#/features/quiz/server'
import { MorseAnswerInput } from '#/features/quiz/components/MorseAnswerInput'
import { CyanBar } from '#/features/quiz/components/ScoreBar'
import { quizMessages } from '#/features/quiz/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/quiz/$slug')({
  loader: ({ params }) => getQuizForAttempt({ data: { slug: params.slug } }),
  head: ({ match, loaderData }) => ({ meta: [{ title: quizMessages[match.context.locale].quizMetaTitle(loaderData?.title ?? 'Quiz') }] }),
  component: QuizPage,
  notFoundComponent: QuizNotFound,
})

function QuizNotFound() {
  const t = useT(quizMessages).run
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

function QuizPage() {
  const quiz = Route.useLoaderData()
  return <QuizRunner key={quiz.id} quiz={quiz} />
}

function QuizRunner({ quiz }: { quiz: QuizForAttempt }) {
  const navigate = useNavigate()
  const submit = useServerFn(submitQuiz)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [view, setView] = useState<MorseView>('audio')
  const inputRef = useRef<HTMLInputElement>(null)
  const firstRender = useRef(true)
  const t = useT(quizMessages).run

  const total = quiz.questions.length
  const q = quiz.questions[index]
  const value = answers[q.id] ?? ''
  const answeredCount = quiz.questions.filter((x) => (answers[x.id] ?? '').trim()).length
  const unanswered = total - answeredCount
  const isLast = index === total - 1
  const inputId = `answer-${q.id}`

  useEffect(() => {
    // Fokus ke input saat berpindah soal (bukan saat halaman pertama dimuat).
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    inputRef.current?.focus()
  }, [index])

  const setValue = (v: string) => setAnswers((a) => ({ ...a, [q.id]: v }))
  const goNext = () => (isLast ? setConfirmOpen(true) : setIndex((i) => Math.min(total - 1, i + 1)))

  async function onSubmit() {
    setPending(true)
    try {
      const res = await submit({
        data: { slug: quiz.slug, answers: quiz.questions.map((x) => ({ questionId: x.id, answer: (answers[x.id] ?? '').trim() })) },
      })
      await navigate({ to: '/quiz/attempts/$attemptId', params: { attemptId: res.attemptId } })
    } catch (err) {
      setPending(false)
      toast.error(err instanceof Error && err.message ? err.message : t.submitError)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="CH-04 · Quiz"
        title={quiz.title}
        description={t.description}
        actions={
          <Button asChild variant="outline">
            <Link to="/quiz">
              <ArrowLeft />
              {t.quizList}
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl">
        <RadioPanel
          channel={q.type === 'encode' ? 'CH-1 · Encode' : 'CH-2 · Decode'}
          title={t.question(index + 1, total)}
          led={pending ? 'blink' : true}
          actions={
            <span className="radio-label hidden text-signal-offwhite/55 sm:inline" aria-hidden="true">
              {t.filled(answeredCount, total)}
            </span>
          }
          bodyClassName="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-3">
            <CyanBar value={answeredCount / total} label={t.filledOf(answeredCount, total)} />
            <ol className="flex flex-wrap gap-1.5" aria-label={t.steps}>
              {quiz.questions.map((x, i) => {
                const filled = !!(answers[x.id] ?? '').trim()
                const current = i === index
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-current={current ? 'step' : undefined}
                      aria-label={t.step(i + 1, filled)}
                      className={cn(
                        'grid size-8 place-items-center rounded-lg font-mono text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan',
                        current
                          ? 'bg-signal-cyan text-signal-navy'
                          : filled
                            ? 'bg-signal-blue/70 text-signal-offwhite hover:bg-signal-blue'
                            : 'border border-white/15 text-signal-offwhite/60 hover:bg-white/10',
                      )}
                    >
                      {i + 1}
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-5 sm:p-6">
            <p className="radio-label text-signal-offwhite/55" id={`${inputId}-hint`}>
              {q.type === 'encode' ? t.encodeHint : t.decodeHint}
            </p>
            {q.type === 'encode' ? (
              <p className="mt-4 font-mono text-4xl font-semibold tracking-[0.18em] break-all text-signal-offwhite sm:text-5xl">{q.prompt}</p>
            ) : (
              <div className="mt-5 flex flex-col gap-3">
                <MorseSymbols code={q.prompt} size="lg" />
                <p className="font-mono text-sm tracking-widest text-signal-offwhite/55" aria-hidden="true">
                  {toDisplay(q.prompt)}
                </p>
              </div>
            )}
          </div>

          {q.type === 'decode' && (
            <div className="-mt-2">
              <button
                type="button"
                onClick={() => setShowViewer((s) => !s)}
                aria-expanded={showViewer}
                className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm text-signal-cyan hover:underline focus-visible:outline-2 focus-visible:outline-signal-cyan"
              >
                {showViewer ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                {showViewer ? t.hideViewer : t.showViewer}
              </button>
              {showViewer && <MorseViewer value={q.prompt} view={view} onViewChange={setView} mode="question" compact className="mt-3 border-white/10" />}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor={inputId} className="text-sm font-medium text-signal-offwhite/85">
              {q.type === 'encode' ? t.encodeLabel : t.decodeLabel}
            </label>
            {q.type === 'encode' ? (
              <MorseAnswerInput ref={inputRef} id={inputId} value={value} onChange={setValue} onEnter={goNext} describedBy={`${inputId}-hint ${inputId}-help`} />
            ) : (
              <input
                ref={inputRef}
                id={inputId}
                value={value}
                onChange={(e) => setValue(e.target.value.slice(0, 200))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    goNext()
                  }
                }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby={`${inputId}-hint ${inputId}-help`}
                placeholder={t.textPlaceholder}
                className="h-14 w-full rounded-xl border border-white/15 bg-black/20 px-4 font-mono text-2xl tracking-[0.15em] text-signal-offwhite uppercase outline-none placeholder:text-base placeholder:tracking-normal placeholder:normal-case placeholder:text-signal-offwhite/35 focus-visible:border-signal-cyan focus-visible:ring-[3px] focus-visible:ring-signal-cyan/30"
              />
            )}
            <p id={`${inputId}-help`} className="text-xs text-signal-offwhite/50">
              {q.type === 'encode' ? t.encodeHelp : t.decodeHelp}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite"
            >
              <ArrowLeft />
              {t.prev}
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {!isLast && (
                <Button type="button" variant="ghost" onClick={() => setConfirmOpen(true)} className="text-signal-offwhite/80 hover:bg-white/10 hover:text-signal-offwhite">
                  {t.submitNow}
                </Button>
              )}
              <Button type="button" size="lg" onClick={goNext}>
                {isLast ? (
                  <>
                    <Send />
                    {t.submitAnswers}
                  </>
                ) : (
                  <>
                    {t.next}
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </div>
        </RadioPanel>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !pending && setConfirmOpen(o)}>
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription>
              {t.confirmMessage(answeredCount, total)}
            </DialogDescription>
          </DialogHeader>
          {unanswered > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2.5 text-sm text-amber-200">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t.unanswered(unanswered)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              {t.review}
            </Button>
            <Button onClick={onSubmit} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              {t.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
