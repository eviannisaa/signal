import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/radio/primitives'
import { MorseTranslator } from '#/features/translator/components/MorseTranslator'
import { translatorMessages } from '#/features/translator/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/translator')({
  head: ({ match }) => ({
    meta: [
      { title: translatorMessages[match.context.locale].metaTitle },
      { name: 'description', content: translatorMessages[match.context.locale].metaDescription },
    ],
  }),
  component: TranslatorPage,
})

function TranslatorPage() {
  const t = useT(translatorMessages)
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <MorseTranslator />
    </>
  )
}
