import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { RadioPanel, SignalLed, SignalMeter } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import type { LessonListItem } from '../server'
import { lessonMessages } from '../messages'

/** Nomor channel lesson, misalnya L-01. */
export function lessonChannel(position: number): string {
  return `L-${String(position).padStart(2, '0')}`
}

/** Ringkasan progress lesson sebagai panel meter. */
export function LessonProgressPanel({ lessons }: { lessons: LessonListItem[] }) {
  const done = lessons.filter((l) => l.completed).length
  const total = lessons.length
  const ratio = total === 0 ? 0 : done / total
  const nextLesson = lessons.find((l) => !l.completed)
  const t = useT(lessonMessages).list
  return (
    <RadioPanel title={t.progressTitle} led={done > 0}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-end gap-4">
          <p className="font-mono text-4xl font-semibold tabular-nums">
            {done}
            <span className="text-xl text-signal-offwhite/45">/{total}</span>
          </p>
          <p className="pb-1 text-sm text-signal-offwhite/65">{t.lessonsDone}</p>
          <SignalMeter value={ratio} bars={Math.max(total, 1)} className="mb-1.5 h-8 text-signal-offwhite" label={t.doneOfTotal(done, total)} />
        </div>
        {nextLesson ? (
          <Button asChild size="lg" className="h-11">
            <Link to="/learn/$slug" params={{ slug: nextLesson.slug }}>
              {done === 0 ? t.startFirst : t.continue} <ArrowRight />
            </Link>
          </Button>
        ) : total > 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-green-300">
            <CheckCircle2 className="size-5" aria-hidden="true" /> {t.allDone}
          </p>
        ) : null}
      </div>
      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={t.progressTitle}
      >
        <div className="h-full rounded-full bg-signal-cyan transition-[width] duration-500" style={{ width: `${ratio * 100}%` }} />
      </div>
    </RadioPanel>
  )
}

/** Daftar lesson bergaya daftar channel, dengan LED pada lesson yang selesai. */
export function LessonChannelList({ lessons }: { lessons: LessonListItem[] }) {
  const nextSlug = lessons.find((l) => !l.completed)?.slug
  const t = useT(lessonMessages).list
  return (
    <RadioPanel title={t.channelList} led={false} bodyClassName="p-2 sm:p-3">
      <ol className="flex flex-col gap-1">
        {lessons.map((l) => {
          const isNext = l.slug === nextSlug
          return (
            <li key={l.slug}>
              <Link
                to="/learn/$slug"
                params={{ slug: l.slug }}
                className={cn(
                  'group flex items-center gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-signal-cyan sm:px-4',
                  isNext && 'bg-white/[0.04] ring-1 ring-signal-cyan/30',
                )}
              >
                <span className="flex w-14 shrink-0 flex-col items-center gap-2">
                  <SignalLed on={l.completed} tone="green" size="md" />
                  <span className="radio-label text-signal-cyan">{lessonChannel(l.position)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-base font-semibold text-signal-offwhite">{l.title}</span>
                    {l.completed ? (
                      <span className="radio-label inline-flex items-center gap-1 rounded-md bg-green-500/15 px-1.5 py-0.5 text-[0.6rem] text-green-300">
                        <CheckCircle2 className="size-3" aria-hidden="true" /> {t.done}
                      </span>
                    ) : isNext ? (
                      <span className="radio-label rounded-md bg-signal-cyan px-1.5 py-0.5 text-[0.6rem] text-signal-navy">{t.next}</span>
                    ) : null}
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1" aria-label={t.characters(l.characters.join(', '))}>
                    {l.characters.map((c) => (
                      <span key={c} aria-hidden="true" className="grid h-6 min-w-6 place-items-center rounded-md border border-white/10 bg-black/20 px-1 font-mono text-xs text-signal-offwhite/80">
                        {c}
                      </span>
                    ))}
                  </span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-signal-offwhite/40 transition-transform group-hover:translate-x-0.5 group-hover:text-signal-offwhite" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ol>
    </RadioPanel>
  )
}
