import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'

import { NoSignal, PageHeader } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { getLesson } from '#/features/lesson/server'
import { CharacterTable, CompleteLessonCard, LessonArticle, LessonPager } from '#/features/lesson/components/LessonDetail'
import { lessonChannel } from '#/features/lesson/components/LessonList'
import { lessonMessages } from '#/features/lesson/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/learn/$slug')({
  loader: async ({ params }) => {
    if (!/^[a-z0-9-]{1,80}$/.test(params.slug)) throw notFound()
    const lesson = await getLesson({ data: { slug: params.slug } })
    if (!lesson) throw notFound()
    return lesson
  },
  head: ({ match, loaderData }) => {
    const t = lessonMessages[match.context.locale]
    return { meta: [{ title: loaderData ? t.detailMetaTitle(loaderData.title) : t.metaTitle }] }
  },
  component: LessonPage,
  notFoundComponent: LessonNotFound,
})

function LessonNotFound() {
  const t = useT(lessonMessages).detail
  return (
    <NoSignal
      title={t.notFoundTitle}
      message={t.notFoundMessage}
      action={
        <Button asChild>
          <Link to="/learn">{t.backToList}</Link>
        </Button>
      }
    />
  )
}

function LessonPage() {
  const lesson = Route.useLoaderData()
  const t = useT(lessonMessages).detail
  return (
    <>
      <Link to="/learn" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> {t.lessonList}
      </Link>
      <PageHeader
        eyebrow={`CH-01 · ${lessonChannel(lesson.position)} · ${t.position(lesson.position, lesson.total)}`}
        title={lesson.title}
        description={t.charactersInLesson(lesson.characters.join('  '))}
        actions={
          lesson.completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-green-400/25 bg-green-400/10 px-2.5 py-1 text-sm font-medium text-green-300">
              <CheckCircle2 className="size-4" aria-hidden="true" /> {t.done}
            </span>
          ) : undefined
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <LessonArticle description={lesson.description} />
        <div className="lg:sticky lg:top-6">
          <CharacterTable key={lesson.slug} characters={lesson.characters} />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-6">
        <CompleteLessonCard lesson={lesson} />
        <LessonPager lesson={lesson} />
      </div>
    </>
  )
}
