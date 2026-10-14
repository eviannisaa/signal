import type { KeyboardEvent, ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

import { cn } from '#/lib/utils'
import { toDisplay } from '#/lib/morse'
import { useT } from '#/lib/i18n'
import { SignalMeter } from '#/components/radio/primitives'
import { practiceMessages } from '../messages'
import { accuracy } from '../practice'
import type { SessionStats } from '../practice'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

/** Pemilih bergaya tombol radio panel (role radiogroup, panah kiri/kanan untuk berpindah). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  columns,
}: {
  label: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  className?: string
  columns?: 2 | 3
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const i = options.findIndex((o) => o.value === value)
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1
    const next = options[(i + delta + options.length) % options.length]
    onChange(next.value)
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)
    el?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'grid gap-1 rounded-lg border border-white/[0.07] bg-black/30 p-1',
        columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-flow-col auto-cols-fr',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-value={o.value}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-center font-mono text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-signal-cyan',
              active ? 'bg-white/10 text-signal-offwhite ring-1 ring-white/10' : 'text-signal-offwhite/60 hover:bg-white/5 hover:text-signal-offwhite',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Label kecil untuk grup pengaturan di panel radio. */
export function ControlLabel({ children, htmlFor, id }: { children: ReactNode; htmlFor?: string; id?: string }) {
  const className = 'radio-label mb-2 block text-signal-offwhite/55'
  if (!htmlFor) {
    return (
      <p id={id} className={className}>
        {children}
      </p>
    )
  }
  return (
    <label htmlFor={htmlFor} id={id} className={className}>
      {children}
    </label>
  )
}

/** Ringkasan sesi: akurasi sebagai bar sinyal, streak, dan jumlah jawaban benar. */
export function SessionMeter({ stats }: { stats: SessionStats }) {
  const t = useT(practiceMessages).meter
  const acc = accuracy(stats)
  const pct = Math.round(acc * 100)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="radio-label text-signal-offwhite/55">{t.accuracy}</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
            {stats.answered === 0 ? '—' : `${pct}%`}
          </p>
        </div>
        <SignalMeter value={acc} bars={8} className="h-10 text-signal-offwhite" label={t.accuracyLabel(pct)} />
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label={t.correct} value={`${stats.correct}/${stats.answered}`} />
        <Stat label={t.streak} value={String(stats.streak)} highlight={stats.streak >= 3} />
        <Stat label={t.best} value={String(stats.best)} />
      </dl>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-2.5">
      <dt className="radio-label text-[0.6rem] text-signal-offwhite/50">{label}</dt>
      <dd className={cn('mt-1 font-mono text-lg font-semibold tabular-nums', highlight && 'text-signal-cyan')}>{value}</dd>
    </div>
  )
}

/** Hasil benar/salah: warna selalu disertai ikon dan teks. */
export function AnswerVerdict({
  correct,
  given,
  expected,
  expectedIsCode,
  children,
}: {
  correct: boolean
  given: string
  expected: string
  /** true jika jawaban berupa kode Morse (mode encode). */
  expectedIsCode?: boolean
  children?: ReactNode
}) {
  const t = useT(practiceMessages).verdict
  const fmt = (v: string) => (expectedIsCode ? toDisplay(v) : v)
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3.5',
        correct ? 'border-green-500/40 bg-green-500/10' : 'border-red-500/40 bg-red-500/10',
      )}
    >
      <p className={cn('flex items-center gap-2 font-semibold', correct ? 'text-green-300' : 'text-red-300')}>
        {correct ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <XCircle className="size-5" aria-hidden="true" />}
        {correct ? t.correct : t.wrong}
      </p>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="text-signal-offwhite/60">{t.yourAnswer}</dt>
        <dd className={cn('font-mono tracking-wider break-all', expectedIsCode && 'text-base')}>{fmt(given) || '—'}</dd>
        <dt className="text-signal-offwhite/60">{t.expected}</dt>
        <dd className={cn('font-mono font-semibold tracking-wider break-all', expectedIsCode && 'text-base')}>{fmt(expected)}</dd>
      </dl>
      {children}
    </div>
  )
}
