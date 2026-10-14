import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { MailCheck, Share2, Target } from 'lucide-react'

import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { RadioPanel, SignalMeter } from '#/components/radio/primitives'
import { RankBadge } from '#/components/radio/RankBadge'
import { Skeleton } from '#/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import type { GameInfo } from '#/features/game/server'

import { getMessages } from '../server'
import type { ScoreEntry } from '../server'
import { messageMessages } from '../messages'
import { Composer } from './Composer'
import { GuessResultsCard, MessageFeed } from './MessageFeed'

/** Halaman Kirim Pesan Morse: form pesan, log transmisi, dan papan score (polling 5 detik). */
export function MessageRoom({ game }: { game: GameInfo }) {
  const t = useT(messageMessages).room
  const queryClient = useQueryClient()
  const fetchFeed = useServerFn(getMessages)
  const key = ['message', game.id, 'feed'] as const
  const feed = useQuery({
    queryKey: key,
    queryFn: () => fetchFeed({ data: { gameId: game.id } }),
    enabled: !!game.me,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key })
  const alone = (feed.data?.playerCount ?? game.playerCount) <= 1

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <Composer gameId={game.id} disabled={!game.me} onSent={refresh} />
        {!game.me || feed.isPending ? (
          <Skeleton className="h-64 rounded-2xl bg-white/5" />
        ) : feed.isError ? (
          <div className="surface-card p-6 text-sm text-muted-foreground">{t.feedFailed}</div>
        ) : (
          <MessageFeed gameId={game.id} messages={feed.data.messages} onChanged={refresh} />
        )}
      </div>
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <Scoreboard scores={feed.data?.scores} loading={!!game.me && feed.isPending} />
        {/* Selalu tampil, termasuk untuk pemain yang baru masuk; tanpa data isinya keadaan kosong */}
        <GuessResultsCard messages={feed.data?.messages ?? []} />
        {game.me && alone && (
          <div className="surface-card flex items-start gap-3 p-5">
            <Share2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{t.inviteTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t.inviteText}
              </p>
            </div>
          </div>
        )}
        <div className="surface-card p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">{t.rulesTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {t.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function Scoreboard({ scores, loading }: { scores?: ScoreEntry[]; loading: boolean }) {
  const t = useT(messageMessages).scoreboard
  const max = Math.max(1, ...(scores ?? []).map((s) => s.points))
  return (
    <RadioPanel channel="SCR" title={t.title} led bodyClassName="p-0 sm:p-0">
      {loading ? (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-10 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : !scores?.length ? (
        <p className="px-5 py-8 text-center text-sm text-signal-offwhite/60">{t.empty}</p>
      ) : (
        <ol className="divide-y divide-white/5" aria-label={t.label}>
          {scores.map((s) => (
            <li key={s.nickname} className={cn('flex items-center gap-3 px-5 py-3', s.isMe && 'bg-signal-cyan/[0.07]')}>
              <RankBadge
                rank={1 + scores.filter((o) => o.points > s.points).length}
                earned={s.points > 0}
                tied={scores.filter((o) => o.points === s.points).length > 1}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{s.nickname}</span>
                  {s.isMe && <span className="shrink-0 rounded bg-signal-cyan/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-signal-cyan">{t.you}</span>}
                </p>
                {/* Statistik ringkas satu baris: ikon dan angka, arti lengkapnya di keterangan dan pembaca layar */}
                <p className="mt-0.5 flex items-center gap-3 font-mono text-[0.7rem] whitespace-nowrap text-signal-offwhite/50">
                  <StatTip icon={<Target className="size-3" aria-hidden="true" />} value={s.guessed} label={t.guesses(s.guessed)} />
                  <StatTip icon={<MailCheck className="size-3" aria-hidden="true" />} value={s.decodedBy} label={t.decoded(s.decodedBy)} />
                </p>
              </div>
              <SignalMeter value={s.points / max} className="text-signal-offwhite" label={t.points(s.points)} />
              <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold" aria-hidden="true">
                {s.points}
              </span>
            </li>
          ))}
        </ol>
      )}
    </RadioPanel>
  )
}

/** Angka statistik dengan ikon. Label lengkap (sudah berisi angka) tampil sebagai tooltip saat diarahkan, difokus, atau diklik (layar sentuh). */
function StatTip({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  const [open, setOpen] = useState(false)
  // Sentuh: ketuk untuk buka atau tutup. Mouse: muncul saat diarahkan dan tetap terbuka saat diklik
  const touch = useRef(false)
  // Status saat jari menekan: tooltip bisa sudah ditutup oleh "klik di luar" sebelum event click tiba
  const wasOpen = useRef(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        type="button"
        aria-label={label}
        // Cegah perilaku bawaan tooltip yang menutup saat diklik dan membuka saat disentuh, lalu atur sendiri
        onPointerDown={(e) => {
          touch.current = e.pointerType !== 'mouse'
          wasOpen.current = open
          e.preventDefault()
        }}
        onFocus={(e) => {
          if (touch.current) e.preventDefault()
        }}
        onClick={(e) => {
          e.preventDefault()
          setOpen(touch.current ? !wasOpen.current : true)
        }}
        className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-signal-offwhite/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-cyan"
      >
        {icon}
        {value}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="font-sans">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
