import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'

import { AuthForm } from '#/features/auth/components/AuthForm'
import { authMessages } from '#/features/auth/messages'
import { safeRedirect } from '#/lib/safe-redirect'

export const Route = createFileRoute('/register')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) throw redirect({ to: safeRedirect(search.redirect) })
  },
  head: ({ match }) => ({ meta: [{ title: authMessages[match.context.locale].registerMetaTitle }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect: target } = Route.useSearch()
  return <AuthForm mode="register" redirect={target} />
}
