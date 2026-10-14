import { useEffect, useState } from 'react'

import { cn } from '#/lib/utils'
import type { TapeMark } from '#/lib/morse-keyer'

/** Lebar satu unit Morse di pita, dalam piksel. */
const PX_PER_UNIT = 9
const HEIGHT = 40

/**
 * Pita kertas seperti register Morse: setiap tekanan tercetak sebagai garis tinta
 * sepanjang durasinya. Bagian terbaru selalu di kanan. `liveSince` membuat garis
 * tumbuh selama kunci masih ditekan.
 */
export function PaperTape({ marks, unit, liveSince = null, label, className }: { marks: TapeMark[]; unit: number; liveSince?: number | null; label?: string; className?: string }) {
  const now = useNow(liveSince !== null)
  const all = liveSince !== null ? [...marks, { on: true, ms: Math.max(0, now - liveSince) }] : marks

  const scale = PX_PER_UNIT / unit
  let x = 12
  const segments: { x: number; w: number }[] = []
  for (const m of all) {
    const w = Math.max(2, m.ms * scale)
    if (m.on) segments.push({ x, w })
    x += w
  }
  const width = x + 12
  const mid = HEIGHT / 2

  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('relative flex h-10 justify-end overflow-hidden rounded-sm bg-[#ebe5d6] shadow-[inset_0_1px_2px_rgb(0_0_0/0.18)]', className)}
    >
      {/* Tepi pita memudar ke kiri agar terasa bergulir */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#ebe5d6] to-transparent" />
      <svg width={width} height={HEIGHT} className="shrink-0">
        <line x1="0" x2={width} y1={mid} y2={mid} stroke="#1b2539" strokeOpacity="0.08" strokeWidth="1" />
        {segments.map((s, i) => (
          <rect key={i} x={s.x} y={mid - 3} width={s.w} height="6" rx="1" fill="#1b2539" fillOpacity="0.88" />
        ))}
      </svg>
    </div>
  )
}

/** Waktu sekarang yang diperbarui setiap frame selama aktif. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => (typeof performance === 'undefined' ? 0 : performance.now()))
  useEffect(() => {
    if (!active) return
    let raf = 0
    const tick = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return now
}
