import { createFileRoute } from '@tanstack/react-router'

import { NoSignal, PageHeader } from '#/components/radio/primitives'
import { getLessons } from '#/features/lesson/server'
import { lessonMessages } from '#/features/lesson/messages'
import { useT } from '#/lib/i18n'
import { LessonChannelList, LessonProgressPanel } from '#/features/lesson/components/LessonList'

export const Route = createFileRoute('/_authed/learn/')({
  head: ({ match }) => ({ meta: [{ title: lessonMessages[match.context.locale].metaTitle }] }),
  loader: () => getLessons(),
  component: LearnPage,
})

function LearnPage() {
  const lessons = Route.useLoaderData()
  const t = useT(lessonMessages).list
  return (
    <>
      <PageHeader
        eyebrow="CH-01 · Learn"
        title={t.title}
        description={t.description}
      />
      {lessons.length === 0 ? (
        <NoSignal title={t.emptyTitle} message={t.emptyMessage} />
      ) : (
        <div className="flex flex-col gap-6">
          <LessonProgressPanel lessons={lessons} />
          <LessonChannelList lessons={lessons} />
        </div>
      )}
    </>
  )
}
