import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '#/lib/utils'

// useLayoutEffect hanya di browser; di server cukup no-op agar tidak ada peringatan SSR
const useIsoLayoutEffect = typeof window === 'undefined' ? () => {} : useLayoutEffect

/**
 * Konten muncul perlahan (naik dan memudar masuk) saat pertama kali masuk layar. Konten yang sudah
 * terlihat saat halaman dibuka, render server, dan pengguna dengan "kurangi gerakan" tampil langsung
 * tanpa animasi, jadi tidak ada konten yang tersembunyi sebelum JavaScript berjalan.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode
  /** Jeda dalam ms, untuk efek berurutan antar item. */
  delay?: number
  className?: string
  as?: 'div' | 'li' | 'section'
}) {
  const ref = useRef<HTMLElement>(null)
  const [hidden, setHidden] = useState(false)

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Hanya sembunyikan konten yang masih di bawah layar; yang sudah terlihat tidak dianimasikan
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return
    setHidden(true)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHidden(false)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined
  return (
    <Tag
      // @ts-expect-error ref untuk elemen dinamis div/li/section
      ref={ref}
      style={style}
      className={cn('reveal', hidden && 'reveal-hidden', className)}
    >
      {children}
    </Tag>
  )
}
