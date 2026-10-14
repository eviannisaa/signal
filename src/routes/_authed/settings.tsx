import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '#/components/radio/primitives'
import { AccountSettings } from '#/features/account/components/AccountSettings'
import { accountMessages } from '#/features/account/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/_authed/settings')({
  head: ({ match }) => ({ meta: [{ title: accountMessages[match.context.locale].metaTitle }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const t = useT(accountMessages)
  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <AccountSettings user={user} />
    </>
  )
}
