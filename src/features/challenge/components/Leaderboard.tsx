import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { RefreshCw, Trophy } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useLocale, useT } from '#/lib/i18n'
import { RadioPanel, SignalMeter } from '#/components/radio/primitives'
import { RankBadge } from '#/components/radio/RankBadge'
import { Skeleton } from '#/components/ui/skeleton'

import { getLeaderboard } from '../server'
import { challengeMessages } from '../messages'
import { formatDuration } from './format'

export const leaderboardKey = (gameId: string) => ['challenge', gameId, 'leaderboard'] as const

export function useLeaderboard(gameId: string) {
  const fetchBoard = useServerFn(getLeaderboard)
  return useQuery({
    queryKey: leaderboardKey(gameId),
    queryFn: () => fetchBoard({ data: { gameId } }),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
}

/** Leaderboard seperti daftar stasiun: peringkat, callsign, bar sinyal sesuai score, dan durasi. */
export function Leaderboard({ gameId }: { gameId: string }) {
  const { data, isPending, isError } = useLeaderboard(gameId)
  const locale = useLocale()
  const m = useT(challengeMessages)
  const t = m.leaderboard

  return (
    <RadioPanel channel="RX" title="Leaderboard" led bodyClassName="p-0 sm:p-0" actions={
        <span className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] text-signal-offwhite/45" title={t.autoRefresh}>
          <RefreshCw className="size-3" aria-hidden="true" />
          <span className="sr-only">{t.refreshSr}</span>
          <span aria-hidden="true">{t.refreshShort}</span>
        </span>
      }>
      {isPending ? (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-11 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : isError ? (
        <p className="p-5 text-sm text-signal-offwhite/65">{t.loadFailed}</p>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <Trophy className="size-7 text-signal-cyan/70" aria-hidden="true" />
          <p className="text-sm text-signal-offwhite/70">{t.empty}</p>
        </div>
      ) : (
        <ol className="divide-y divide-white/5" aria-label={t.ranking}>
          {data.map((row) => (
            <li key={`${row.rank}-${row.nickname}`} className={cn('flex items-center gap-3 px-5 py-3', row.isMe && 'bg-signal-cyan/[0.07]')}>
              <RankBadge
                rank={1 + data.filter((o) => o.score > row.score || (o.score === row.score && o.durationMs < row.durationMs)).length}
                earned={row.score > 0}
                tied={data.filter((o) => o.score === row.score && o.durationMs === row.durationMs).length > 1}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium">
                  <span className="truncate">{row.nickname}</span>
                  {row.isMe && <span className="shrink-0 rounded bg-signal-cyan/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-signal-cyan">{t.you}</span>}
                </p>
                <p className="font-mono text-xs text-signal-offwhite/55">{formatDuration(row.durationMs, locale)}</p>
              </div>
              <SignalMeter value={row.total ? row.score / row.total : 0} className="text-signal-offwhite" label={m.result.scoreLabel(row.score, row.total)} />
              <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold" aria-hidden="true">
                {row.score}/{row.total}
              </span>
            </li>
          ))}
        </ol>
      )}
    </RadioPanel>
  )
}
