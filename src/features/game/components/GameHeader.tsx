import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Gamepad2, Radio, UserRound } from 'lucide-react'

import { useT } from '#/lib/i18n'
import { ChannelDisplay, SignalLed, SignalMeter } from '#/components/radio/primitives'

import { getGame } from '../server'
import type { GameInfo, GameType } from '../server'
import { gameMessages } from '../messages'

/** Judul game ada di gameMessages.types sesuai bahasa aktif. */
export const GAME_META: Record<GameType, { channel: string; label: string }> = {
  challenge: { channel: 'CH-G1', label: 'Challenge' },
  message: { channel: 'CH-G2', label: 'Message' },
}

export const gameQueryKey = (gameId: string) => ['game', gameId] as const

/** Header game bergaya panel frekuensi: FREQ <gameId>, link, dan jumlah pemain sebagai bar sinyal. */
export function GameHeader({ game, children }: { game: GameInfo; children?: ReactNode }) {
  const t = useT(gameMessages)
  const fetchGame = useServerFn(getGame)
  // Jumlah pemain diperbarui berkala agar pemain baru langsung terlihat
  const { data } = useQuery({
    queryKey: gameQueryKey(game.id),
    queryFn: () => fetchGame({ data: { gameId: game.id } }),
    initialData: game,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
  const count = data.playerCount
  const meta = GAME_META[game.type]

  return (
    <section aria-label={t.header.info} className="radio-panel mb-8 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
        <SignalLed size="sm" />
        <ChannelDisplay channel={meta.channel} label={meta.label} />
        {/* Ruang game dan status siaran diberi ikon dengan jarak yang sama */}
        <span className="radio-label hidden items-center gap-1.5 text-signal-offwhite/50 sm:inline-flex">
          <Gamepad2 className="size-3.5" aria-hidden="true" />
          {t.header.room}
        </span>
        <span className="radio-label hidden items-center gap-1.5 text-signal-cyan/80 sm:inline-flex">
          <Radio className="size-3.5" aria-hidden="true" />
          {t.header.onAir}
        </span>
        <div className="ml-auto flex items-center gap-2.5 text-signal-offwhite/80">
          <SignalMeter value={Math.min(1, count / 8)} label={t.header.playersJoined(count)} />
          <span className="font-mono text-xs" aria-hidden="true">
            {t.header.players(count)}
          </span>
        </div>
      </div>
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t.types[game.type].title}</h1>
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono">
            <span className="radio-label text-signal-cyan" aria-hidden="true">
              {t.header.freq}
            </span>
            {/* Kode game seperti angka layar radio: cyan berpendar, dikelompokkan per 4 karakter */}
            <span
              className="inline-flex flex-wrap gap-x-2.5 text-xl font-medium tracking-[0.14em] text-signal-cyan tabular-nums [text-shadow:0_0_10px_rgb(6_182_212/0.45)]"
              aria-label={t.header.code(game.id)}
            >
              {(game.id.match(/.{1,4}/g) ?? [game.id]).map((part, i) => (
                <span key={i} aria-hidden="true">
                  {part}
                </span>
              ))}
            </span>
          </p>
          {game.me && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-sm text-signal-offwhite/85">
              <UserRound className="size-3.5 text-signal-cyan" aria-hidden="true" />
              <span className="sr-only">{t.header.yourNickname}</span>
              {game.me.nickname}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}
