import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Eye, Headphones, Info, ListChecks, Loader2, Play, Timer } from 'lucide-react'
import { toast } from 'sonner'

import { playMorse } from '#/lib/morse-audio'
import { useT } from '#/lib/i18n'
import { RadioPanel } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import type { GameInfo } from '#/features/game/server'

import { getMyChallenge, startChallenge } from '../server'
import type { ChallengeState, SubmittedChallenge } from '../server'
import { TIME_LIMIT_SEC, TOLERANCE_SEC } from '../score'
import { challengeMessages } from '../messages'
import { ChallengeResult } from './ChallengeResult'
import { ChallengeRunner } from './ChallengeRunner'
import { Leaderboard, leaderboardKey } from './Leaderboard'

/** Halaman Tantangan Morse: layar mulai, tantangan berjalan, atau hasil, beserta leaderboard. */
export function ChallengeRoom({ game }: { game: GameInfo }) {
  const t = useT(challengeMessages).room
  const queryClient = useQueryClient()
  const fetchState = useServerFn(getMyChallenge)
  const start = useServerFn(startChallenge)
  const [local, setLocal] = useState<ChallengeState | null>(null)
  const [starting, setStarting] = useState(false)

  const stateQuery = useQuery({
    queryKey: ['challenge', game.id, 'me'],
    queryFn: () => fetchState({ data: { gameId: game.id } }),
    enabled: !!game.me,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  const state = local ?? stateQuery.data

  async function onStart() {
    // AudioContext dibuat atau di-resume pada interaksi ini agar soal Audio Signal dapat langsung diputar
    try {
      playMorse('', { sound: true }).stop()
    } catch {
      // Audio tidak tersedia; soal tetap dapat dikerjakan
    }
    setStarting(true)
    try {
      setLocal(await start({ data: { gameId: game.id } }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.startFailed)
      void stateQuery.refetch()
    } finally {
      setStarting(false)
    }
  }

  function onSubmitted(result: SubmittedChallenge) {
    setLocal(result)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    void queryClient.invalidateQueries({ queryKey: leaderboardKey(game.id) })
  }

  let main: ReactNode
  if (!game.me || (stateQuery.isPending && !local)) {
    main = game.me ? <Skeleton className="h-96 rounded-2xl bg-white/5" /> : <ChallengeIntro disabled starting={false} onStart={onStart} />
  } else if (stateQuery.isError && !local) {
    main = (
      <div className="surface-card flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-muted-foreground">{t.loadFailed}</p>
        <Button variant="outline" onClick={() => void stateQuery.refetch()}>
          {t.retry}
        </Button>
      </div>
    )
  } else if (state?.status === 'running') {
    main = <ChallengeRunner gameId={game.id} state={state} onSubmitted={onSubmitted} />
  } else if (state?.status === 'submitted') {
    main = <ChallengeResult gameId={game.id} result={state} />
  } else {
    main = <ChallengeIntro starting={starting} onStart={onStart} />
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0">{main}</div>
      <aside className="lg:sticky lg:top-24">
        <Leaderboard gameId={game.id} />
      </aside>
    </div>
  )
}

function ChallengeIntro({ starting, disabled, onStart }: { starting: boolean; disabled?: boolean; onStart: () => void }) {
  const t = useT(challengeMessages).intro
  const rules = [
    { icon: <ListChecks />, title: t.rules.mixedTitle, text: t.rules.mixedText },
    { icon: <Timer />, title: t.rules.timeTitle(TIME_LIMIT_SEC), text: t.rules.timeText },
    { icon: <Eye />, title: t.rules.viewsTitle, text: t.rules.viewsText },
  ]
  return (
    <RadioPanel channel="CH-G1" title={t.panelTitle} led>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold">{t.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-signal-offwhite/70">
            {t.description}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {rules.map((r) => (
            <li key={r.title} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <span className="grid size-8 place-items-center rounded-lg bg-signal-cyan/15 text-signal-cyan [&_svg]:size-4" aria-hidden="true">
                {r.icon}
              </span>
              <p className="mt-3 font-semibold">{r.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-signal-offwhite/60">{r.text}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-start gap-3 rounded-xl border border-signal-cyan/25 bg-signal-cyan/[0.07] p-4 text-sm text-signal-offwhite/80">
          <Headphones className="mt-0.5 size-4 shrink-0 text-signal-cyan" aria-hidden="true" />
          <p>
            <span className="font-semibold text-signal-offwhite">{t.iosTitle}</span> {t.iosText}
          </p>
        </div>
        <p className="flex items-start gap-2 text-xs text-signal-offwhite/50">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t.tolerance(TOLERANCE_SEC)}
        </p>
        <Button size="lg" onClick={onStart} disabled={disabled || starting} className="h-12 self-start rounded-xl px-8 text-base">
          {starting ? <Loader2 className="animate-spin" /> : <Play />}
          {disabled ? t.needNickname : starting ? t.starting : t.start}
        </Button>
      </div>
    </RadioPanel>
  )
}
