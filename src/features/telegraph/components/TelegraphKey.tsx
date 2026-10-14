import type { PointerEvent } from 'react'

import { cn } from '#/lib/utils'

/** Titik putar tuas (koordinat SVG). Tuas berputar beberapa derajat saat ditekan. */
const PIVOT = { x: 96, y: 84 }

/**
 * Kunci telegraf model straight key. Jika `onDown`/`onUp` diberikan, kunci bisa ditekan
 * dengan mouse atau sentuhan (tahan = sinyal menyala). Tanpa handler, kunci hanya
 * bergerak mengikuti `pressed`, dipakai sebagai sounder telegram masuk.
 */
export function TelegraphKey({
  pressed,
  onDown,
  onUp,
  disabled,
  label,
  className,
}: {
  pressed: boolean
  /** Menerima event.timeStamp agar durasi tekan akurat. */
  onDown?: (at: number) => void
  onUp?: (at: number) => void
  disabled?: boolean
  label: string
  className?: string
}) {
  const art = <KeyArt pressed={pressed} />

  if (!onDown || !onUp) {
    return (
      <div role="img" aria-label={label} className={cn('select-none', className)}>
        {art}
      </div>
    )
  }

  function handleDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || disabled) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onDown?.(e.timeStamp)
  }

  return (
    <button
      type="button"
      data-telegraph-key
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={handleDown}
      onPointerUp={(e) => onUp(e.timeStamp)}
      onPointerCancel={(e) => onUp(e.timeStamp)}
      onLostPointerCapture={(e) => onUp(e.timeStamp)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        // Enter juga bisa mengetuk saat kunci difokus; Spasi ditangani di level window
        if (e.key === 'Enter' && !e.repeat) {
          e.preventDefault()
          onDown(e.timeStamp)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onUp(e.timeStamp)
        }
      }}
      className={cn(
        'block w-full cursor-pointer touch-none rounded-lg select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal-cyan disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {art}
    </button>
  )
}

function KeyArt({ pressed }: { pressed: boolean }) {
  return (
    <svg viewBox="0 38 360 104" className="block h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="tk-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8bd86" />
          <stop offset="0.55" stopColor="#a8854c" />
          <stop offset="1" stopColor="#7a5f33" />
        </linearGradient>
        <linearGradient id="tk-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#253049" />
          <stop offset="1" stopColor="#151d2e" />
        </linearGradient>
        <linearGradient id="tk-knob" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4256" />
          <stop offset="1" stopColor="#0c111c" />
        </linearGradient>
      </defs>

      {/* Alas */}
      <rect x="14" y="112" width="332" height="26" rx="5" fill="url(#tk-base)" stroke="rgb(255 255 255 / 0.08)" />
      <rect x="14" y="112" width="332" height="1" fill="rgb(255 255 255 / 0.1)" />
      <circle cx="34" cy="125" r="4" fill="#0c111c" stroke="rgb(255 255 255 / 0.12)" />
      <circle cx="326" cy="125" r="4" fill="#0c111c" stroke="rgb(255 255 255 / 0.12)" />

      {/* Tiang poros */}
      <rect x="82" y="80" width="28" height="32" rx="2" fill="url(#tk-brass)" />
      <rect x="76" y="106" width="40" height="6" rx="1.5" fill="url(#tk-brass)" />

      {/* Kontak bawah: menyala cyan saat rangkaian tertutup */}
      <rect x="236" y="100" width="16" height="12" rx="1.5" fill="url(#tk-brass)" />
      <rect x="238" y="96" width="12" height="4" rx="1" fill={pressed ? '#06B6D4' : '#5b6478'} style={{ transition: 'fill 60ms linear' }} />

      {/* Pegas dan sekrup penyetel */}
      <rect x="164" y="98" width="10" height="14" rx="1.5" fill="url(#tk-brass)" />

      {/* Tuas */}
      <g
        style={{
          transform: `rotate(${pressed ? 3.2 : 0}deg)`,
          transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
          transition: 'transform 40ms ease-out',
        }}
      >
        <path d="M169 84 v12" stroke="#c8ccd6" strokeWidth="2" strokeDasharray="2 2" />
        <rect x="58" y="78" width="250" height="11" rx="3" fill="url(#tk-brass)" />
        <rect x="58" y="78" width="250" height="1.5" fill="rgb(255 255 255 / 0.35)" />
        <circle cx={PIVOT.x} cy={PIVOT.y} r="5" fill="#7a5f33" stroke="#d8bd86" strokeWidth="1" />
        <rect x="240" y="89" width="8" height="5" fill="#a8854c" />
        {/* Kenop */}
        <rect x="282" y="70" width="12" height="9" fill="#1a2030" />
        <ellipse cx="288" cy="70" rx="34" ry="6" fill="#0c111c" />
        <rect x="254" y="52" width="68" height="18" fill="url(#tk-knob)" />
        <ellipse cx="288" cy="52" rx="34" ry="6" fill="#4a5368" />
      </g>
    </svg>
  )
}
