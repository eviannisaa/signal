import { Link, Outlet, createFileRoute, notFound } from '@tanstack/react-router'

import { NoSignal } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { gameIdSchema } from '#/features/game/id'
import { getGame } from '#/features/game/server'
import { GameHeader, NicknameDialog, ShareLink } from '#/features/game/components'
import { gameMessages } from '#/features/game/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/g/$gameId')({
  loader: async ({ params }) => {
    // ID dengan format tidak valid ditolak sebelum query ke database
    const parsed = gameIdSchema.safeParse(params.gameId)
    if (!parsed.success) throw notFound()
    return getGame({ data: { gameId: parsed.data } })
  },
  head: ({ loaderData, match }) => ({
    meta: [
      {
        title: loaderData
          ? gameMessages[match.context.locale].meta.title(gameMessages[match.context.locale].types[loaderData.type].title)
          : gameMessages[match.context.locale].meta.notFoundTitle,
      },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
    ],
  }),
  component: GameLayout,
  notFoundComponent: GameNotFound,
})

function GameLayout() {
  const game = Route.useLoaderData()
  return (
    <>
      <GameHeader game={game}>
        <ShareLink gameId={game.id} />
      </GameHeader>
      <Outlet />
      {!game.me && <NicknameDialog gameId={game.id} />}
    </>
  )
}

function GameNotFound() {
  const t = useT(gameMessages).notFound
  return (
    <div className="py-6">
      <NoSignal
        title={t.title}
        message={t.message}
        action={
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/" hash="game">
              {t.backHome}
            </Link>
          </Button>
        }
      />
    </div>
  )
}
