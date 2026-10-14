import { memo, useMemo, useRef } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, BookOpen, ChartLine, Headphones, Keyboard, Languages, ListChecks, Lock, Radio } from 'lucide-react'

import { cn } from '#/lib/utils'
import { encode, toTimings, totalUnits } from '#/lib/morse'
import { usePrefersReducedMotion } from '#/components/morse/use-morse-player'
import { useTransmitClock } from '#/components/radio/use-transmit-clock'
import { Reveal } from '#/components/motion/Reveal'
import { Button } from '#/components/ui/button'
import { GameCards } from '#/features/game/components'
import { MorseExplorer } from '#/features/explorer/components/MorseExplorer'
import { landingMessages } from '#/features/landing/messages'
import { useT } from '#/lib/i18n'

export const Route = createFileRoute('/')({
  head: ({ match }) => ({
    meta: [{ title: landingMessages[match.context.locale].metaTitle }, { name: 'description', content: landingMessages[match.context.locale].metaDescription }],
  }),
  component: Home,
})

function Home() {
  const { user } = Route.useRouteContext()
  return (
    // .dark .landing: seluruh beranda memakai tema gelap kaca, termasuk komponen game dan explorer
    <div className="dark landing relative isolate bg-background text-foreground">
      <Hero />
      {/* Cahaya brand samar di sepanjang halaman agar panel kaca punya sesuatu untuk diburamkan */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[100vh] bottom-0 -z-10 overflow-hidden">
        <div className="absolute top-[4%] -left-40 h-[36rem] w-[36rem] rounded-full bg-signal-blue/[0.12] blur-[120px]" />
        <div className="absolute top-[36%] -right-40 h-[36rem] w-[36rem] rounded-full bg-signal-cyan/[0.1] blur-[120px]" />
        <div className="absolute top-[72%] left-1/4 h-[32rem] w-[40rem] rounded-full bg-signal-blue/[0.1] blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.025)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:linear-gradient(to_bottom,transparent,black_12%,transparent_35%,black_60%,transparent)]" />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-4 pb-20 sm:gap-32 sm:px-6 sm:pb-28">
        <GameSection />
        <ExplorerSection />
        <LearningSection loggedIn={!!user} />
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- Shared */

function SectionHeading({ id, index, label, title, description }: { id: string; index: string; label: string; title: string; description: ReactNode }) {
  return (
    <div className="mb-14 sm:mb-16">
      {/* Pembatas antar bagian: garis tipis dengan satu titik sinyal di tengah */}
      <div aria-hidden="true" className="relative mb-14 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent sm:mb-16">
        {/* Kilau tipis menyapu garis pemisah, seperti sinyal yang lewat */}
        <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          <div className="animate-sweep h-px w-1/3 bg-gradient-to-r from-transparent via-signal-cyan/60 to-transparent" />
        </div>
        <span className="animate-beacon absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-signal-cyan shadow-[0_0_10px_2px_rgb(6_182_212/0.7)]" />
      </div>
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="radio-label mb-5 flex justify-center gap-3 text-muted-foreground">
          <span className="text-signal-cyan">{index}</span>
          {label}
        </p>
        <h2 id={id} className="text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[2.75rem]">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      </Reveal>
    </div>
  )
}

/* ------------------------------------------------------------------- Hero */

const HERO_WORD = 'SIGNAL'
const HERO_CODE = encode(HERO_WORD)
const UNIT_MS = 95
const HOLD_UNITS = 16

/** Rentang (dalam unit) setiap huruf HERO_WORD: dari awal simbol pertama sampai akhir simbol terakhir. */
function letterSpans(code: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = []
  let current: { start: number; end: number } | null = null
  let t = 0
  for (const s of toTimings(code)) {
    if (s.on) {
      if (!current) spans.push((current = { start: t, end: t }))
      current.end = t + s.units
    } else if (s.units >= 3) current = null
    t += s.units
  }
  return spans
}

/** Ruang kosong di kiri dan kanan sinyal, sebagai bagian dari total lebar garis horizon. */
const LEAD = 0.14

/** Waveform horizon selebar layar. Garis datar di kedua sisi, denyut SIGNAL di tengah. */
const HorizonWave = memo(function HorizonWave({ className }: { className?: string }) {
  const timings = toTimings(HERO_CODE)
  const total = totalUnits(timings)
  const W = 1000
  const scale = (W * (1 - 2 * LEAD)) / total
  const hi = 14
  const lo = 96
  let x = W * LEAD
  let d = `M0 ${lo} L${x} ${lo}`
  for (const t of timings) {
    const w = t.units * scale
    d += t.on ? ` L${x} ${lo} L${x} ${hi} L${x + w} ${hi} L${x + w} ${lo}` : ` L${x + w} ${lo}`
    x += w
  }
  d += ` L${W} ${lo}`
  return (
    <svg viewBox={`0 0 ${W} 110`} preserveAspectRatio="none" className={cn('block h-24 w-full sm:h-32', className)} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
    </svg>
  )
})

function Hero() {
  const t = useT(landingMessages).hero
  return (
    <section id="hero" aria-labelledby="hero-title" className="relative isolate -mt-16 overflow-hidden text-signal-offwhite">
      {/* Latar: cahaya brand dari atas dan grid samar. Batas bawah hero ditandai pembatas bagian berikutnya */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgb(37_99_235/0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_35%,black,transparent)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-36 text-center sm:px-6 sm:pt-44">
        <p className="animate-rise radio-label mb-7 flex justify-center gap-4 text-signal-offwhite/50">
          <span>{t.eyebrow}</span>
          <span className="text-signal-cyan/80">A–Z, 0–9</span>
        </p>
        <h1 id="hero-title" style={{ animationDelay: '120ms' }} className="animate-rise text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-[4.5rem]">
          {t.title}
        </h1>
        <p style={{ animationDelay: '240ms' }} className="animate-rise mx-auto mt-7 max-w-[52rem] text-[1.0625rem] leading-relaxed text-signal-offwhite/60">
          {t.line1}
          <br />
          {t.line2}
          <br className="hidden sm:block" /> {t.line3}
        </p>
        <div style={{ animationDelay: '360ms' }} className="animate-rise mt-9 flex flex-col justify-center gap-2.5 min-[420px]:flex-row">
          <Button asChild size="lg" className="h-10 px-5 shadow-[0_0_24px_-6px_rgb(37_99_235/0.8)]">
            <Link to="/learn">
              {t.startLearning} <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-10 border-white/15 bg-white/[0.04] px-5 text-signal-offwhite backdrop-blur hover:bg-white/10 hover:text-signal-offwhite"
          >
            <Link to="/translator">{t.openTranslator}</Link>
          </Button>
        </div>
      </div>

      <Horizon />
    </section>
  )
}

/**
 * Garis horizon: sinyal SIGNAL berjalan di satu waveform selebar layar, dan huruf
 * hasil decode muncul di bawah setiap kelompok denyut.
 */
function Horizon() {
  const m = useT(landingMessages).hero
  const reduced = usePrefersReducedMotion()
  const timings = useMemo(() => toTimings(HERO_CODE), [])
  const total = totalUnits(timings)
  const spans = useMemo(() => letterSpans(HERO_CODE), [])
  const ref = useRef<HTMLDivElement>(null)
  const t = useTransmitClock(total, reduced, ref, UNIT_MS, HOLD_UNITS)

  const now = t ?? total
  const transmitting = t !== null && t < total
  const typed = spans.filter((s) => s.start <= now).length
  const active = transmitting ? typed - 1 : -1
  // Posisi horizontal (persen) untuk waktu u pada timeline
  const at = (u: number) => (LEAD + (1 - 2 * LEAD) * (Math.min(u, total) / total)) * 100
  const head = transmitting ? at(now) : 100

  return (
    <div ref={ref} className="relative mt-20 pb-20 sm:mt-24 sm:pb-24" role="img" aria-label={m.horizonLabel(HERO_WORD)}>
      <div aria-hidden="true">
        {/* Cahaya lembut di sekitar garis dasar sinyal */}
        <div className="absolute inset-x-0 top-[5.25rem] h-72 -translate-y-1/2 bg-[radial-gradient(ellipse_40%_50%_at_50%_50%,rgb(6_182_212/0.14),transparent_70%)] sm:top-28" />

        <div className="relative [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <HorizonWave className="text-white/10" />
          <div
            className="absolute inset-0 transition-[clip-path] duration-100 ease-linear drop-shadow-[0_0_6px_rgb(6_182_212/0.9)]"
            style={{ clipPath: `inset(0 ${100 - head}% 0 0)` }}
          >
            <HorizonWave className="text-signal-cyan" />
          </div>
          {transmitting && (
            <span
              className="absolute -inset-y-6 w-px bg-gradient-to-b from-transparent via-signal-cyan to-transparent shadow-[0_0_12px_2px_rgb(6_182_212/0.6)]"
              style={{ left: `${head}%` }}
            />
          )}
        </div>

        {/* Huruf hasil decode, di tengah kelompok denyutnya */}
        <div className="relative mt-4 h-6">
          {spans.map((s, i) => (
            <span
              key={i}
              className={cn(
                'absolute -translate-x-1/2 font-mono text-sm tracking-widest transition-colors duration-200 sm:text-base',
                i < typed ? 'text-signal-offwhite/70' : 'text-signal-offwhite/10',
                i === active && 'text-signal-cyan',
              )}
              style={{ left: `${at((s.start + s.end) / 2)}%` }}
            >
              {HERO_WORD[i]}
            </span>
          ))}
        </div>

        <p className="radio-label mt-10 flex justify-center gap-5 text-signal-offwhite/35 tabular-nums">
          <span>TX 7.040 MHz</span>
          <span>12 WPM</span>
          <span className={transmitting ? 'text-signal-cyan/80' : undefined}>{transmitting ? m.onAir : m.sent}</span>
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Game */

function GameSection() {
  const t = useT(landingMessages).game
  return (
    <section aria-labelledby="game-title" className="scroll-mt-24" id="game">
      <SectionHeading
        id="game-title"
        index="01"
        label={t.label}
        title={t.title}
        description={t.description}
      />
      {/* Form gabung lewat link (JoinForm) disembunyikan sementara; komponennya tetap ada di features/game */}
      <Reveal delay={120}>
        <GameCards />
      </Reveal>
    </section>
  )
}

/* --------------------------------------------------------------- Explorer */

function ExplorerSection() {
  const t = useT(landingMessages).explorer
  return (
    <section aria-labelledby="explorer-title" className="scroll-mt-24" id="explorer">
      <SectionHeading
        id="explorer-title"
        index="02"
        label={t.label}
        title={t.title}
        description={t.description}
      />
      <Reveal delay={120}>
        <MorseExplorer />
      </Reveal>
    </section>
  )
}

/* --------------------------------------------------------------- Learning */

interface Feature {
  to: '/learn' | '/practice' | '/listening' | '/telegraph' | '/quiz' | '/progress' | '/translator'
  key: keyof (typeof landingMessages)['id']['features']
  channel: string
  icon: ComponentType<{ className?: string }>
  private: boolean
}

const FEATURES: Feature[] = [
  { to: '/learn', key: 'learn', channel: 'CH-01', icon: BookOpen, private: true },
  { to: '/practice', key: 'practice', channel: 'CH-02', icon: Keyboard, private: true },
  { to: '/listening', key: 'listening', channel: 'CH-03', icon: Headphones, private: true },
  { to: '/telegraph', key: 'telegraph', channel: 'CH-06', icon: Radio, private: true },
  { to: '/quiz', key: 'quiz', channel: 'CH-04', icon: ListChecks, private: true },
  { to: '/progress', key: 'progress', channel: 'CH-05', icon: ChartLine, private: true },
  { to: '/translator', key: 'translator', channel: 'TX', icon: Languages, private: false },
]

function LearningSection({ loggedIn }: { loggedIn: boolean }) {
  const m = useT(landingMessages)
  const t = m.learning
  const cta = m.cta
  return (
    <section aria-labelledby="learn-title" className="scroll-mt-24" id="belajar">
      <SectionHeading
        id="learn-title"
        index="03"
        label={t.label}
        title={t.title}
        description={t.description}
      />
      <ul className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal as="li" key={f.to} delay={(i % 3) * 90} className={cn('border-t border-white/10', !f.private && 'sm:col-span-2 lg:col-span-3')}>
            <Link to={f.to} className="group relative flex h-full flex-col gap-3 py-7 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal-cyan">
              {/* Garis atas menyala dari kiri saat diarahkan, seperti kanal yang dipilih */}
              <span
                aria-hidden="true"
                className="absolute -top-px left-0 h-px w-full origin-left scale-x-0 bg-signal-cyan shadow-[0_0_8px_1px_rgb(6_182_212/0.6)] transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                <span className="flex items-center gap-2.5">
                  <f.icon className="size-4 text-signal-cyan" />
                  <span className="radio-label">{f.channel}</span>
                </span>
                {f.private ? (
                  <span className="inline-flex items-center gap-1 text-xs" title={t.needsAccount}>
                    <Lock className="size-3" aria-hidden="true" />
                    <span className="sr-only">{t.needsAccount}</span>
                  </span>
                ) : (
                  <span className="radio-label text-signal-cyan">{t.public}</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="flex items-center gap-1.5 text-base font-semibold transition-colors group-hover:text-signal-cyan">
                  {m.features[f.key].title}
                  <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.features[f.key].description}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>

      <Reveal className="relative mt-32 text-center sm:mt-40">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-80 bg-[radial-gradient(ellipse_45%_55%_at_50%_45%,rgb(37_99_235/0.18),transparent_70%)]"
        />
        <h3 className="mx-auto max-w-2xl text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[2.75rem]">
          {loggedIn ? cta.titleLoggedIn : cta.titleGuest}
        </h3>
        <p className="mx-auto mt-5 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
          {loggedIn ? cta.bodyLoggedIn : cta.bodyGuest}
        </p>
        <div className="mt-9 flex flex-col justify-center gap-2.5 min-[420px]:flex-row">
          {loggedIn ? (
            <Button asChild size="lg" className="h-10 px-5 shadow-[0_0_24px_-6px_rgb(37_99_235/0.8)]">
              <Link to="/learn">
                {cta.openLesson} <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="h-10 px-5 shadow-[0_0_24px_-6px_rgb(37_99_235/0.8)]">
                <Link to="/register">
                  {cta.signUpFree} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-10 border-white/15 bg-white/[0.04] px-5 text-signal-offwhite hover:bg-white/10 hover:text-signal-offwhite">
                <Link to="/login">{cta.signIn}</Link>
              </Button>
            </>
          )}
        </div>
        {/* Garis horizon penutup, menggemakan hero */}
        <div aria-hidden="true" className="mt-20 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
          <HorizonWave className="h-16! text-signal-cyan/50 drop-shadow-[0_0_6px_rgb(6_182_212/0.6)] sm:h-20!" />
        </div>
      </Reveal>
    </section>
  )
}
