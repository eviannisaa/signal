import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Loader2, Radio, Send, Timer, Trophy, Users } from 'lucide-react'
import { toast } from 'sonner'

import { encode, toTimings, totalUnits } from '#/lib/morse'
import { useT } from '#/lib/i18n'
import { usePrefersReducedMotion } from '#/components/morse/use-morse-player'
import { useTransmitClock } from '#/components/radio/use-transmit-clock'
import { ChannelDisplay, MorseSymbols, Waveform } from '#/components/radio/primitives'
import { Button } from '#/components/ui/button'

import { createGame } from '../server'
import type { GameType } from '../server'
import { gameMessages } from '../messages'

interface GameCardProps {
  type: GameType
  channel: string
  label: string
  title: string
  description: string
  signal: string
  features: { icon: ReactNode; text: string }[]
}

/** Judul, deskripsi, dan teks fitur diambil dari gameMessages sesuai bahasa aktif. */
const CARDS: (Pick<GameCardProps, 'type' | 'channel' | 'label' | 'signal'> & { icons: ReactNode[] })[] = [
  { type: 'challenge', channel: 'CH-G1', label: 'Challenge', signal: 'GO', icons: [<Timer key="timer" />, <Trophy key="trophy" />, <Users key="users" />] },
  { type: 'message', channel: 'CH-G2', label: 'Message', signal: 'HI', icons: [<Send key="send" />, <Radio key="radio" />, <Trophy key="trophy" />] },
]

/** Satu kolom game di landing page, tanpa kartu. Tombol "Tune in" langsung membuat game baru. */
export function GameCard({
  type,
  channel,
  label,
  title,
  description,
  signal,
  features,
  pending,
  disabled,
  onTune,
}: GameCardProps & { pending: boolean; disabled: boolean; onTune: (type: GameType) => void }) {
  const t = useT(gameMessages).card
  const code = encode(signal)
  const headingId = `game-card-${type}`
  // Simbol Morse sinyal kartu menyala bergantian mengikuti ritme Morse, lalu jeda dan berulang
  const reduced = usePrefersReducedMotion()
  const morseRef = useRef<HTMLDivElement>(null)
  const at = useTransmitClock(totalUnits(toTimings(code)), reduced, morseRef, 120, 12)
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-6 py-10 first:pt-0 last:pb-0 md:py-0 md:first:pr-12 md:last:pl-12">
      <header className="flex items-center gap-3">
        <ChannelDisplay channel={channel} label={label} />
      </header>
      <div ref={morseRef}>
        <div className="flex items-center justify-between gap-3">
          <MorseSymbols code={code} size="sm" at={at} />
          <span className="font-mono text-[0.6875rem] text-signal-offwhite/40 tabular-nums" aria-hidden="true">
            {type === 'challenge' ? '7.040 MHz' : '14.060 MHz'}
          </span>
        </div>
        {/* Gelombang tipis dan redup sebagai aksen, tidak bersaing dengan garis horizon di hero */}
        <Waveform code={code} height={40} className="mt-3 h-6 text-signal-offwhite opacity-50" />
      </div>
      <div>
        <h3 id={headingId} className="text-xl font-semibold sm:text-2xl">
          {/* Kata "Morse" disorot cyan, seperti sinyal yang menyala */}
          {title.split(/(Morse)/).map((part, i) =>
            part === 'Morse' ? (
              <span key={i} className="text-signal-cyan">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </h3>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-signal-offwhite/60">{description}</p>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t.summary}>
        {features.map((f) => (
          <li key={f.text} className="radio-label inline-flex items-center gap-1.5 text-signal-offwhite/50 [&_svg]:size-3.5 [&_svg]:text-signal-cyan/70">
            {f.icon}
            {f.text}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        size="lg"
        disabled={disabled}
        onClick={() => onTune(type)}
        className="mt-auto h-10 w-full sm:w-auto sm:self-start sm:px-5"
        aria-label={t.tuneInLabel(title)}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Radio />}
        {pending ? t.creating : t.tuneIn}
      </Button>
    </article>
  )
}

/** Dua game di landing page, dipisah garis tipis. */
export function GameCards() {
  const t = useT(gameMessages)
  const navigate = useNavigate()
  const create = useServerFn(createGame)
  const [pending, setPending] = useState<GameType | null>(null)

  async function onTune(type: GameType) {
    setPending(type)
    try {
      const { gameId } = await create({ data: { type } })
      await navigate({ to: '/g/$gameId', params: { gameId } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.card.createFailed)
      setPending(null)
    }
  }

  return (
    <div className="grid divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0">
      {CARDS.map(({ icons, ...card }) => {
        const m = t.types[card.type]
        const features = icons.map((icon, i) => ({ icon, text: m.features[i] }))
        return <GameCard key={card.type} {...card} title={m.title} description={m.description} features={features} pending={pending === card.type} disabled={pending !== null} onTune={onTune} />
      })}
    </div>
  )
}
