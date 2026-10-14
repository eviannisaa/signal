import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/radio/primitives'
import { ListeningTrainer } from '#/features/listening/components/ListeningTrainer'
import { listeningMessages } from '#/features/listening/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/listening')({
  head: ({ match }) => ({ meta: [{ title: listeningMessages[match.context.locale].page.metaTitle }] }),
  component: ListeningPage,
})

function ListeningPage() {
  const t = useT(listeningMessages).page
  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
      />
      <ListeningTrainer />
    </>
  )
}
