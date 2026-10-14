import { HeadContent, Link, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import appCss from '../styles/app.css?url'
import { getRootContext } from '#/features/auth/server'
import type { CurrentUser } from '#/features/auth/server'
import { RadioShell } from '#/components/radio/RadioShell'
import { NoSignal } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Toaster } from '#/components/ui/sonner'
import { TooltipProvider } from '#/components/ui/tooltip'
import { shellMessages } from '#/components/radio/messages'
import { useLocale, useT } from '#/lib/i18n'

interface RouterContext {
  queryClient: QueryClient
  user?: CurrentUser | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: () => getRootContext(),
  head: ({ match }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: shellMessages[match.context.locale].metaTitle },
      { name: 'description', content: shellMessages[match.context.locale].metaDescription },
      { name: 'theme-color', content: '#172033' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: NotFound,
})

function NotFound() {
  const t = useT(shellMessages)
  return (
    <NoSignal
      title={t.notFoundTitle}
      message={t.notFoundMessage}
      action={
        <Button asChild>
          <Link to="/">{t.backHome}</Link>
        </Button>
      }
    />
  )
}

function RootLayout() {
  const { user } = Route.useRouteContext()
  return (
    <RadioShell user={user ?? null}>
      <Outlet />
    </RadioShell>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-center" richColors />
        <Scripts />
      </body>
    </html>
  )
}
