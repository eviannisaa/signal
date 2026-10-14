import { Fragment } from 'react'
import type { ReactNode } from 'react'

import { cn } from '#/lib/utils'
import { normalizeMorse, toSpoken, toTimings, totalUnits } from '#/lib/morse'
import { useLocale, useT } from '#/lib/i18n'
import { primitivesMessages } from './primitives-messages'

/* ------------------------------------------------------------------ Logo */

export function SignalLogo({ className, size = 36 }: { className?: string; size?: number }) {
  // Tanpa latar: strip mengikuti warna teks (currentColor), titik tetap cyan
  return (
    <svg viewBox="12 26 70 42" width={size} height={size * 0.6} className={cn('shrink-0', className)} aria-hidden="true">
      <rect x="15" y="30" width="37" height="10" rx="5" fill="currentColor" />
      <circle cx="67" cy="35" r="5" fill="#06B6D4" />
      <circle cx="27" cy="59" r="5" fill="#06B6D4" />
      <rect x="41" y="54" width="38" height="10" rx="5" fill="currentColor" />
    </svg>
  )
}

/* ------------------------------------------------------------------- LED */

export function SignalLed({
  on = true,
  tone = 'cyan',
  blink = false,
  size = 'md',
  className,
}: {
  on?: boolean
  tone?: 'cyan' | 'blue' | 'green' | 'red'
  blink?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const color = { cyan: '#06B6D4', blue: '#2563EB', green: '#22C55E', red: '#EF4444' }[tone]
  const px = { sm: 6, md: 8, lg: 10 }[size]
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 rounded-full transition-all duration-100', blink && on && 'animate-led', className)}
      style={{
        width: px,
        height: px,
        background: on ? color : 'rgb(148 163 184 / 0.28)',
        boxShadow: on ? `0 0 0 2px color-mix(in oklab, ${color} 22%, transparent)` : 'none',
      }}
    />
  )
}

/* ---------------------------------------------------------- Signal meter */

export function SignalMeter({ value, bars = 5, className, label }: { value: number; bars?: number; className?: string; label?: string }) {
  const t = useT(primitivesMessages)
  const active = Math.round(Math.max(0, Math.min(1, value)) * bars)
  return (
    <span className={cn('inline-flex items-end gap-[3px]', className)} role="img" aria-label={label ?? t.percent(Math.round(value * 100))}>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={cn('w-[3px] rounded-[1px] transition-colors', i < active ? 'bg-signal-cyan' : 'bg-current opacity-20')} style={{ height: 5 + i * 3 }} />
      ))}
    </span>
  )
}

/* ------------------------------------------------------ Channel display */

export function ChannelDisplay({ channel, label, className }: { channel: string; label: string; className?: string }) {
  return (
    <span className={cn('radio-label inline-flex items-center gap-3 text-signal-offwhite/75', className)}>
      <span className="text-signal-cyan">{channel}</span>
      {label}
    </span>
  )
}

/* ----------------------------------------------------------- Radio panel */

export function RadioPanel({
  title,
  channel,
  led = true,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  channel?: string
  led?: boolean | 'blink'
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('radio-panel overflow-hidden', className)}>
      {(title || actions) && (
        <header className="flex min-h-11 items-center gap-3 border-b border-white/[0.07] px-5 py-2.5">
          {led && <SignalLed blink={led === 'blink'} size="sm" />}
          {channel && <span className="radio-label text-signal-offwhite/40">{channel}</span>}
          {title && <h2 className="radio-label truncate text-signal-offwhite/80">{title}</h2>}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  )
}

/* ---------------------------------------------------------- Morse symbols */

/**
 * Simbol Morse sebagai bentuk titik dan strip. Jika `at` (waktu transmisi dalam unit) diberikan, simbol
 * menyala bergantian mengikuti ritme Morse: yang sedang dikirim terang bercahaya, yang sudah lewat redup,
 * yang belum dikirim samar.
 */
export function MorseSymbols({
  code,
  size = 'md',
  at,
  className,
}: {
  code: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  at?: number | null
  className?: string
}) {
  const locale = useLocale()
  const clean = normalizeMorse(code)
  const dot = { xs: 4, sm: 8, md: 12, lg: 18 }[size]
  const words = clean ? clean.split(' / ') : []
  // Rentang waktu (unit) tiap simbol, berurutan sesuai kemunculannya di kode
  const ranges: { start: number; end: number }[] = []
  let t = 0
  for (const s of toTimings(clean)) {
    if (s.on) ranges.push({ start: t, end: t + s.units })
    t += s.units
  }
  let n = 0
  const tone = (i: number) => {
    if (at === undefined || at === null) return undefined
    const r = ranges[i]
    if (at >= r.start && at < r.end) return 'lit'
    return at >= r.end ? 'sent' : 'idle'
  }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-5 gap-y-3', className)} role="img" aria-label={clean ? toSpoken(clean, locale) : primitivesMessages[locale].empty}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-flex items-center gap-3">
          {word.split(' ').map((letter, li) => (
            <span key={li} className="inline-flex items-center" style={{ gap: dot * 0.45 }}>
              {Array.from(letter).map((s, si) => {
                const state = tone(n++)
                return (
                  <span
                    key={si}
                    className={cn(
                      'rounded-full transition-[opacity,box-shadow] duration-100',
                      s === '.' ? 'bg-morse-dot' : 'bg-morse-dash',
                      state === 'idle' && 'opacity-25',
                      state === 'sent' && 'opacity-60',
                      state === 'lit' && (s === '.' ? 'shadow-[0_0_10px_2px_rgb(6_182_212/0.85)]' : 'shadow-[0_0_10px_2px_rgb(37_99_235/0.9)]'),
                    )}
                    style={{ width: s === '.' ? dot : dot * 3, height: dot }}
                  />
                )
              })}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}

/**
 * Simbol Morse dengan penulisan pada umumnya, sama seperti Audio Signal: titik dan strip ringkas, "/" di antara
 * huruf, dan "//" di antara kata. Pemisah ikut huruf sebelumnya agar garis miring tidak membuka baris baru.
 */
export function MorseSlashed({ code, className }: { code: string; className?: string }) {
  const locale = useLocale()
  const clean = normalizeMorse(code)
  const words = clean
    .split(' / ')
    .filter(Boolean)
    .map((w) => w.split(' ').filter(Boolean))
  return (
    <span className={cn('flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5', className)} role="img" aria-label={clean ? toSpoken(clean, locale) : primitivesMessages[locale].empty}>
      {words.map((word, wi) =>
        word.map((letter, li) => {
          const sep = li < word.length - 1 ? '/' : wi < words.length - 1 ? '//' : ''
          return (
            <span key={`${wi}-${li}`} className="inline-flex items-center gap-1.5" aria-hidden="true">
              <span className="inline-flex items-center gap-1">
                {Array.from(letter).map((sym, si) => (
                  <span key={si} className={cn('h-1.5 rounded-full', sym === '.' ? 'w-1.5 bg-morse-dot' : 'w-4.5 bg-morse-dash')} />
                ))}
              </span>
              {sep && <span className="font-mono text-xs text-signal-offwhite/35">{sep}</span>}
            </span>
          )
        }),
      )}
    </span>
  )
}

/* ------------------------------------------------------- Morse notation */

/**
 * Notasi Morse tipis (titik dan garis). Kisinya sama persis dengan MorseSymbols pada ukuran
 * yang sama: lebar slot titik, panjang strip, dan jarak antarsimbol, sehingga setiap simbol
 * sejajar dengan pasangannya di atas. Digambar sebagai bentuk, bukan karakter "·" dan "—",
 * karena di font monospace titik berada di tengah kotak lebar sehingga tampak menjorok.
 */
export function MorseNotation({ code, size = 'md', className }: { code: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const words = normalizeMorse(code).split(' / ').filter(Boolean)
  const unit = { sm: 8, md: 12, lg: 18 }[size]
  const dot = Math.round(unit * 0.55)
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-5 gap-y-2', className)} aria-hidden="true">
      {words.map((word, wi) => (
        <Fragment key={wi}>
          {wi > 0 && <span className="font-mono text-sm text-signal-offwhite/35">/</span>}
          <span className="inline-flex flex-wrap items-center gap-3">
            {word.split(' ').map((letter, li) => (
              <span key={li} className="inline-flex items-center" style={{ gap: unit * 0.45 }}>
                {Array.from(letter).map((s, si) =>
                  s === '.' ? (
                    <span key={si} className="grid place-items-center" style={{ width: unit, height: unit }}>
                      <span className="rounded-full bg-morse-dot" style={{ width: dot, height: dot }} />
                    </span>
                  ) : (
                    <span key={si} className="rounded-full bg-morse-dash" style={{ width: unit * 3, height: 3 }} />
                  ),
                )}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

/* -------------------------------------------------------------- Waveform */

export function Waveform({
  code,
  progress,
  height = 64,
  className,
}: {
  code: string
  /** Posisi playhead 0..1, kosong jika tidak diputar. */
  progress?: number | null
  height?: number
  className?: string
}) {
  const timings = toTimings(code)
  const total = Math.max(1, totalUnits(timings))
  const W = 1000
  const pad = 8
  const hi = 10
  const lo = height - 10
  let x = 0
  const segs: { x1: number; x2: number; on: boolean; symbol?: '.' | '-' }[] = []
  for (const t of timings) {
    const w = (t.units / total) * W
    segs.push({ x1: x, x2: x + w, on: t.on, symbol: t.symbol })
    x += w
  }
  let d = `M0 ${lo}`
  for (const s of segs) d += s.on ? ` L${s.x1} ${lo} L${s.x1} ${hi} L${s.x2} ${hi} L${s.x2} ${lo}` : ` L${s.x2} ${lo}`
  d += ` L${W} ${lo}`
  return (
    <svg viewBox={`${-pad} 0 ${W + pad * 2} ${height}`} preserveAspectRatio="none" className={cn('block h-16 w-full', className)} aria-hidden="true">
      {/* Garis dasar sepanjang gelombang saja, agar kedua ujungnya rata. Ruang pad di viewBox hanya untuk tebal garis */}
      <line x1={0} x2={W} y1={lo} y2={lo} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {segs
        .filter((s) => s.on)
        .map((s, i) => (
          <rect key={i} x={s.x1} y={hi} width={s.x2 - s.x1} height={lo - hi} fill={s.symbol === '.' ? '#06B6D4' : '#2563EB'} fillOpacity="0.1" />
        ))}
      <path d={d} fill="none" stroke="#06B6D4" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
      {progress != null && progress > 0 && progress < 1 && (
        <line x1={progress * W} x2={progress * W} y1="2" y2={height - 2} stroke="#F8FAFC" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  )
}

/* -------------------------------------------------------------- No signal */

export function NoSignal({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  const t = useT(primitivesMessages)
  return (
    <div className="radio-panel mx-auto flex max-w-lg flex-col items-center gap-5 px-8 py-12 text-center">
      <svg viewBox="0 0 240 40" className="h-10 w-60 text-signal-cyan/60" aria-hidden="true">
        <path d="M0 20 H240" stroke="currentColor" strokeWidth="2" strokeDasharray="2 6" />
      </svg>
      <p className="radio-label text-signal-cyan">{t.noSignal}</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {message && <p className="max-w-sm text-sm text-signal-offwhite/70">{message}</p>}
      {action}
    </div>
  )
}

/* ------------------------------------------------------------ Page header */

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  // Eyebrow "CH-01 · Learn": kanal tampil cyan seperti nomor bagian di beranda, sisanya redup
  const [channel, ...rest] = eyebrow?.split(' · ') ?? []
  return (
    <div className="mb-10 sm:mb-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="radio-label mb-4 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              <span className="text-signal-cyan">{channel}</span>
              {rest.length > 0 && <span>{rest.join(' · ')}</span>}
            </p>
          )}
          <h1 className="text-3xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-[2.5rem]">{title}</h1>
          {description && <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {/* Pembatas: garis tipis dengan titik sinyal di ujung kiri dan kilau yang menyapu, senada dengan pembatas bagian di beranda */}
      <div aria-hidden="true" className="relative mt-8 h-px bg-gradient-to-r from-border via-border to-transparent sm:mt-10">
        <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_right,black_60%,transparent)]">
          <div className="animate-sweep h-px w-1/3 bg-gradient-to-r from-transparent via-signal-cyan/60 to-transparent" />
        </div>
        <span className="animate-beacon absolute top-1/2 left-0 size-1.5 -translate-y-1/2 rounded-full bg-signal-cyan shadow-[0_0_10px_2px_rgb(6_182_212/0.7)]" />
      </div>
    </div>
  )
}
