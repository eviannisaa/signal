import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/radio/primitives'
import { PracticeTrainer } from '#/features/practice/components/PracticeTrainer'
import { practiceMessages } from '#/features/practice/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/practice')({
  head: ({ match }) => ({ meta: [{ title: practiceMessages[match.context.locale].page.metaTitle }] }),
  component: PracticePage,
})

function PracticePage() {
  const t = useT(practiceMessages).page
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />
      <PracticeTrainer />
    </>
  )
}
