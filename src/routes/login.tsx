import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthForm } from '#/features/auth/components/AuthForm'
import { authMessages } from '#/features/auth/messages'
import { safeRedirect } from '#/lib/safe-redirect'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ to: safeRedirect(search.redirect) })
  },
  head: ({ match }) => ({ meta: [{ title: authMessages[match.context.locale].loginMetaTitle }] }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target } = Route.useSearch()
  return <AuthForm mode="login" redirect={target} />
}
