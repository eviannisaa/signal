import { useCallback, useEffect, useRef, useState } from 'react'

import { playMorse } from '#/lib/morse-audio'
import type { KeyVoice, MorsePlayback } from '#/lib/morse-audio'

/** State pemutaran Morse untuk LED, lampu, dan playhead. Pemutaran lama selalu dihentikan dulu. */
export function useMorsePlayer() {
  const ref = useRef<MorsePlayback | null>(null)
  const [playing, setPlaying] = useState(false)
  const [on, setOn] = useState(false)
  const [symbol, setSymbol] = useState<'.' | '-' | undefined>()
  const [progress, setProgress] = useState<number | null>(null)

  const stop = useCallback(() => {
    ref.current?.stop()
    ref.current = null
    setPlaying(false)
    setOn(false)
    setProgress(null)
  }, [])

  const play = useCallback(
    (code: string, opts: { wpm?: number; sound?: boolean; frequency?: number; voice?: KeyVoice } = {}) => {
      ref.current?.stop()
      setPlaying(true)
      ref.current = playMorse(code, {
        ...opts,
        onToggle: (o, s) => {
          setOn(o)
          if (o) setSymbol(s)
        },
        onProgress: setProgress,
        onEnd: () => {
          ref.current = null
          setPlaying(false)
          setProgress(null)
        },
      })
    },
    [],
  )

  useEffect(() => () => ref.current?.stop(), [])

  return { play, stop, playing, on, symbol, progress }
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}
