import { createFileRoute, getRouteApi } from '@tanstack/react-router'

import { ChallengeRoom } from '#/features/challenge/components/ChallengeRoom'
import { MessageRoom } from '#/features/message/components/MessageRoom'

const layout = getRouteApi('/g/$gameId')

export const Route = createFileRoute('/g/$gameId/')({ component: GameRoom })

/** Menampilkan Tantangan atau Kirim Pesan sesuai game.type. */
function GameRoom() {
  const game = layout.useLoaderData()
  return game.type === 'challenge' ? <ChallengeRoom key={game.me?.id ?? 'guest'} game={game} /> : <MessageRoom key={game.me?.id ?? 'guest'} game={game} />
}
