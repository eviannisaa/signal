import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MousePointerClick } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/lib/i18n'
import { ALL_VIEWS, MORSE_TABLE, toDitDah, toSpoken } from '#/lib/morse'
import type { MorseView } from '#/lib/morse'
import { MorseViewer } from '#/components/morse/MorseViewer'
import { MorseSymbols, RadioPanel, SignalLed, Waveform } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '#/components/ui/dialog'
import { useStoredState } from '#/features/practice/use-stored-state'
import { completeLesson } from '../server'
import type { LessonDetail } from '../server'
import { lessonMessages } from '../messages'

const viewSchema = z.enum(ALL_VIEWS)
const parseView = (raw: unknown): MorseView => viewSchema.catch('audio').parse(raw)

/** Materi lesson: paragraf sans-serif yang nyaman dibaca. */
export function LessonArticle({ description }: { description: string }) {
  const paragraphs = description
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const t = useT(lessonMessages).article
  return (
    <article className="surface-card px-6 py-7 sm:px-8 sm:py-9">
      <h2 className="radio-label mb-5 text-signal-blue">{t.heading}</h2>
      <div className="flex max-w-prose flex-col gap-4 text-[1.0625rem] leading-relaxed text-foreground/85">
        {paragraphs.map((p, i) => (
          <p key={i} className={cn(i === 0 && 'text-lg text-foreground')}>
            {p}
          </p>
        ))}
      </div>
    </article>
  )
}

/** Tabel karakter: setiap sel menampilkan simbol Morse dan waveform kecil. Klik membuka MorseViewer. */
export function CharacterTable({ characters }: { characters: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [view, setView] = useStoredState('signal.lesson.view', parseView, 'audio')
  const code = selected ? (MORSE_TABLE[selected] ?? '') : ''
  const t = useT(lessonMessages).table
  const locale = useLocale()

  return (
    <RadioPanel title={t.title} actions={<span className="radio-label text-signal-offwhite/50">{t.count(characters.length)}</span>}>
      <p className="mb-4 flex items-center gap-2 text-sm text-signal-offwhite/65">
        <MousePointerClick className="size-4 shrink-0" aria-hidden="true" />
        {t.hint}
      </p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {characters.map((char) => {
          const c = MORSE_TABLE[char] ?? ''
          return (
            <li key={char}>
              <button
                type="button"
                onClick={() => setSelected(char)}
                aria-label={t.open(char, toSpoken(c, locale))}
                className="group flex h-full w-full flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-signal-cyan/50 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-mono text-3xl leading-none font-medium">{char}</span>
                  <span className="font-mono text-[0.65rem] text-signal-offwhite/45" aria-hidden="true">
                    {t.signals(c.length)}
                  </span>
                </span>
                <MorseSymbols code={c} size="sm" className="min-h-3" />
                <Waveform code={c} height={28} className="h-5 text-signal-offwhite" />
              </button>
            </li>
          )
        })}
      </ul>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="gap-0 overflow-hidden border-white/10 bg-[#0c1220] p-0 text-signal-offwhite sm:max-w-2xl [&>button]:text-signal-offwhite">
          {selected && (
            <>
              <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4 pr-12">
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-black/30 font-mono text-3xl font-medium ring-1 ring-white/10">{selected}</span>
                <div className="min-w-0">
                  <DialogTitle className="radio-label text-signal-cyan">{t.character(selected)}</DialogTitle>
                  <DialogDescription className="mt-1 font-mono text-sm text-signal-offwhite/70">{toDitDah(code)}</DialogDescription>
                </div>
              </div>
              <div className="max-h-[75vh] overflow-y-auto p-3 sm:p-4">
                <MorseViewer value={selected} view={view} onViewChange={setView} compact mode="learn" className="border-white/10" />
                {/* Morse Chart tidak lagi menjadi tab, tetapi tetap bagian dari materi: jalur huruf ini di pohon Morse */}
                <section aria-label="Morse Chart" className="mt-4">
                  <h3 className="radio-label mb-2 px-1 text-signal-offwhite/60">Morse Chart</h3>
                  <MorseViewer value={selected} view="chart" hideTabs compact mode="learn" className="border-white/10" />
                </section>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </RadioPanel>
  )
}

/** Tombol "Tandai selesai". completeLesson aman dipanggil berulang. */
export function CompleteLessonCard({ lesson }: { lesson: LessonDetail }) {
  const router = useRouter()
  const complete = useServerFn(completeLesson)
  const [pending, setPending] = useState(false)
  const t = useT(lessonMessages).complete

  async function onComplete() {
    setPending(true)
    try {
      await complete({ data: { slug: lesson.slug } })
      await router.invalidate()
      toast.success(t.toast(lesson.title))
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t.error)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-live="polite">
      {lesson.completed ? (
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-green-400/10 text-green-400 ring-1 ring-green-400/20">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-green-300">{t.doneTitle}</p>
            <p className="text-sm text-muted-foreground">
              {lesson.next ? t.doneNext : t.doneLast}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.05] ring-1 ring-white/10">
            <SignalLed on={false} />
          </span>
          <div>
            <p className="font-semibold">{t.askTitle}</p>
            <p className="text-sm text-muted-foreground">{t.askMessage}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!lesson.completed && (
          <Button size="lg" className="h-11" onClick={onComplete} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
            {t.markDone}
          </Button>
        )}
        {lesson.completed && lesson.next && (
          <Button asChild size="lg" className="h-11">
            <Link to="/learn/$slug" params={{ slug: lesson.next.slug }}>
              {t.nextLesson} <ArrowRight />
            </Link>
          </Button>
        )}
        {lesson.completed && !lesson.next && (
          <Button asChild size="lg" className="h-11">
            <Link to="/quiz">
              {t.openQuiz} <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

/** Navigasi lesson sebelumnya dan berikutnya. */
export function LessonPager({ lesson }: { lesson: LessonDetail }) {
  const t = useT(lessonMessages).pager
  return (
    <nav aria-label={t.nav} className="grid gap-3 sm:grid-cols-2">
      {lesson.prev ? (
        <PagerLink slug={lesson.prev.slug} title={lesson.prev.title} dir="prev" />
      ) : (
        <Link to="/learn" className="surface-card flex items-center gap-3 p-4 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> {t.backToList}
        </Link>
      )}
      {lesson.next ? <PagerLink slug={lesson.next.slug} title={lesson.next.title} dir="next" /> : <span className="hidden sm:block" />}
    </nav>
  )
}

function PagerLink({ slug, title, dir }: { slug: string; title: string; dir: 'prev' | 'next' }) {
  const next = dir === 'next'
  const t = useT(lessonMessages).pager
  return (
    <Link
      to="/learn/$slug"
      params={{ slug }}
      className={cn(
        'surface-card group flex items-center gap-3 p-4 transition-colors hover:border-signal-blue/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-blue',
        next && 'flex-row-reverse text-right',
      )}
    >
      {next ? (
        <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-signal-blue" aria-hidden="true" />
      ) : (
        <ArrowLeft className="size-4 shrink-0 text-muted-foreground group-hover:text-signal-blue" aria-hidden="true" />
      )}
      <span className="min-w-0">
        <span className="radio-label block text-muted-foreground">{next ? t.next : t.prev}</span>
        <span className="mt-0.5 block truncate font-semibold">{title}</span>
      </span>
    </Link>
  )
}
