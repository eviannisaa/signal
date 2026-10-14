import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Waktu transmisi berjalan dalam unit bulat, berulang: `total` unit sinyal lalu `holdUnits` unit diam.
 * Diperbarui per unit (bukan per frame) dan berhenti saat elemen tidak terlihat atau tab disembunyikan.
 * null saat gerak dikurangi.
 */
export function useTransmitClock(
  total: number,
  reduced: boolean,
  target: RefObject<HTMLElement | null>,
  unitMs: number,
  holdUnits: number,
): number | null {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (reduced) return
    const cycle = total + holdUnits
    let timer: ReturnType<typeof setInterval> | null = null
    let visible = true
    const sync = () => {
      const run = visible && !document.hidden
      if (run && !timer)
        timer = setInterval(() => setStep((s) => (s + 1) % cycle), unitMs)
      if (!run && timer) {
        clearInterval(timer)
        timer = null
      }
    }
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      sync()
    })
    if (target.current) io.observe(target.current)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', sync)
      if (timer) clearInterval(timer)
    }
  }, [total, reduced, target, unitMs, holdUnits])
  return reduced ? null : step
}
