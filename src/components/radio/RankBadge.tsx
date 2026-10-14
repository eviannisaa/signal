import { useId } from 'react'

import { cn } from '#/lib/utils'
import { useT } from '#/lib/i18n'
import { primitivesMessages } from './primitives-messages'

/** Warna logam medali: kilau terang, warna dasar, dan bayangan tepi. */
const MEDALS = {
  1: {
    name: 'gold',
    light: '#fde68a',
    base: '#f59e0b',
    dark: '#b45309',
    ribbon: '#2563eb',
  },
  2: {
    name: 'silver',
    light: '#f1f5f9',
    base: '#cbd5e1',
    dark: '#64748b',
    ribbon: '#06b6d4',
  },
  3: {
    name: 'bronze',
    light: '#efb48a',
    base: '#b06a32',
    dark: '#5c2e10',
    ribbon: '#1e3a8a',
  },
} as const

/**
 * Lencana peringkat: medali emas, perak, dan perunggu untuk peringkat 1 sampai 3 (pita, cakram logam
 * bergradasi, dan angka peringkat), lalu angka biasa mulai peringkat 4. Medali hanya tampil jika `earned`,
 * yaitu pemain sudah punya nilai; sebelum itu peringkat tampil sebagai angka. Jika `tied` (seri dengan pemain
 * lain di peringkat yang sama), yang tampil adalah piala dengan warna logam peringkatnya, bukan medali.
 */
export function RankBadge({
  rank,
  earned = true,
  tied = false,
  className,
}: {
  rank: number
  earned?: boolean
  tied?: boolean
  className?: string
}) {
  const t = useT(primitivesMessages)
  const id = useId()
  const medal =
    earned && (rank === 1 || rank === 2 || rank === 3) ? MEDALS[rank] : null

  if (medal && tied) {
    return (
      <span
        className={cn('grid size-8 shrink-0 place-items-center', className)}
        role="img"
        aria-label={t.rankTied(rank, t.medals[medal.name])}
      >
        <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
          <defs>
            <linearGradient
              id={`${id}-cup-${rank}`}
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop offset="0" stopColor={medal.light} />
              <stop offset="0.55" stopColor={medal.base} />
              <stop offset="1" stopColor={medal.dark} />
            </linearGradient>
          </defs>
          {/* Gagang kiri dan kanan */}
          <path
            d="M9 7 H5.5 Q4 7 4 9 Q4 14 10 15"
            fill="none"
            stroke={medal.dark}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M23 7 H26.5 Q28 7 28 9 Q28 14 22 15"
            fill="none"
            stroke={medal.dark}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Mangkuk piala, tiang, dan alas */}
          <path
            d="M8 5 H24 V12 Q24 19 16 19.5 Q8 19 8 12 Z"
            fill={`url(#${id}-cup-${rank})`}
          />
          <rect x="14.5" y="19" width="3" height="4.5" fill={medal.dark} />
          <rect
            x="10.5"
            y="23.5"
            width="11"
            height="3.5"
            rx="1"
            fill={`url(#${id}-cup-${rank})`}
          />
          <text
            x="16"
            y="15"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fontFamily="var(--font-mono)"
            fill={medal.dark}
          >
            {rank}
          </text>
        </svg>
      </span>
    )
  }

  if (!medal) {
    return (
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center font-mono text-sm font-semibold text-signal-offwhite/55',
          className,
        )}
        aria-label={t.rank(rank)}
      >
        {rank}
      </span>
    )
  }

  return (
    <span
      className={cn('grid size-8 shrink-0 place-items-center', className)}
      role="img"
      aria-label={t.rankMedal(rank, t.medals[medal.name])}
    >
      <svg viewBox="0 0 32 36" className="h-8 w-auto" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-disc-${rank}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={medal.light} />
            <stop offset="0.55" stopColor={medal.base} />
            <stop offset="1" stopColor={medal.dark} />
          </linearGradient>
        </defs>
        {/* Pita */}
        <path d="M8 0 H14 L18 12 H12 Z" fill={medal.ribbon} />
        <path d="M24 0 H18 L14 12 H20 Z" fill={medal.ribbon} opacity="0.75" />
        {/* Cakram medali dengan cincin dalam dan angka peringkat */}
        <circle cx="16" cy="23" r="11" fill={`url(#${id}-disc-${rank})`} />
        <circle
          cx="16"
          cy="23"
          r="8"
          fill="none"
          stroke={medal.dark}
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        <text
          x="16"
          y="27"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fontFamily="var(--font-mono)"
          fill={medal.dark}
        >
          {rank}
        </text>
      </svg>
    </span>
  )
}
