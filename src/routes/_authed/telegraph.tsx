import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/radio/primitives'
import { TelegraphTrainer } from '#/features/telegraph/components/TelegraphTrainer'
import { telegraphMessages } from '#/features/telegraph/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/telegraph')({
  head: ({ match }) => ({ meta: [{ title: telegraphMessages[match.context.locale].page.metaTitle }] }),
  component: TelegraphPage,
})

function TelegraphPage() {
  const t = useT(telegraphMessages).page
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />
      <TelegraphTrainer />
    </>
  )
}
